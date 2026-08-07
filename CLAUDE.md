# Midnight — how it actually works

Reference for anyone reading this repo: judges, reviewers, or an AI agent picking up
the code. It documents the system as built, including the parts that are deliberately
missing. Where something is a known weakness, it says so.

The user-facing pitch lives in [README.md](README.md). This file is the mechanism.

---

## 1. The problem

People lose crypto in three ways, and a plain wallet defends against none of them:

| Failure | What happens today | What Midnight does |
|---|---|---|
| **Stolen key** | Thief drains the wallet instantly | Withdrawals need M-of-N guardian approvals; the key alone moves nothing |
| **Lost key** | Funds are unreachable forever | Guardians rotate ownership to a new address behind a 48h timelock |
| **Death or absence** | Heirs need seed phrases, lawyers, or luck | After an inactivity period plus a 48h notice, heirs claim exact weighted shares |

One contract per user holds the funds and enforces all three. There is no server, no
database, and no custody: the vault is the only source of truth.

Midnight is a ground-up rebuild of [Vaultix](https://github.com/MartinPuli/repoHackItba)
(HackITBA 2026). The README has the full before/after table; the short version is that
Vaultix hardcoded 2-of-2 guardians and 50/50 inheritance, had a snapshot bug that paid
late deposits to the wrong heir, and served the UI from a database whose balance
service was mocked.

---

## 2. Run it

```bash
cd contracts && npm install && npm test     # 50 passing
```

Local end-to-end, three terminals:

```bash
cd contracts && npx hardhat node
```
```bash
cd contracts && npm run deploy:local && npm run demo:local
```
```bash
cd web && npm install && npm run dev
```

`deploy:local` prints a factory address. **Paste it into `web/.env.local` yourself** —
the script deliberately does not write the file, because a `bscTestnet` deploy would
otherwise clobber whatever the frontend is pointed at.

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x…
NEXT_PUBLIC_CHAIN_ID=31337        # 97 for BSC Testnet
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

`demo:local` seeds a vault owned by hardhat account #0, guarded by #1–#3 (threshold 2),
with heirs #4 (60%) and #5 (40%). Open http://localhost:3000 and connect on chain 31337.

After changing a contract:

```bash
cd contracts && npm run compile && npm run sync-abi
```

`sync-abi` regenerates `web/src/lib/abi.ts`. If you add a field to `VaultSummary`, also
add it to `web/src/lib/types.ts` — that type is hand-written and the compiler will not
catch the drift for you.

---

## 3. Repo map

```
contracts/
  contracts/
    MidnightVault.sol       all vault logic; clonable, initializer-based
    MidnightFactory.sol     EIP-1167 clones + role discovery registry
    mocks/MockERC20.sol     well-behaved test token
    mocks/HostileERC20.sol  test token that reverts on balanceOf and/or transfer
  test/MidnightVault.test.ts   50 tests, 8 groups
  scripts/deploy.ts · demo-local.ts · export-abi.mjs
web/
  src/app/          /  landing · /app  dashboard · /preview  mocked design preview
  src/components/   role panels + shared UI
  src/lib/          abi, chain config, formatting, hooks
docs/DESIGN-DECISIONS.md    why each choice was made, with the rejected alternatives
```

---

## 4. Contract mechanics

### 4.1 Deployment shape

`MidnightFactory` deploys one `MidnightVault` implementation in its constructor and
then hands every user an [EIP-1167](https://eips.ethereum.org/EIPS/eip-1167) minimal
proxy — a 45-byte clone that delegates to it. That is roughly 10× cheaper than
deploying real logic per user.

Because clones cannot run a constructor, the vault uses `initialize(InitParams)`. The
implementation's own constructor sets `_initialized = true`, so the implementation can
never be initialized and hijacked. `createVault` marks `isVault[clone] = true` *before*
calling `initialize`, so the clone is already a recognised vault if initialization ever
needs to call back.

### 4.2 Roles and limits

| Constant | Value | Meaning |
|---|---|---|
| `MAX_GUARDIANS` / `MAX_HEIRS` | 10 | bounds the loops that clear and re-set config |
| `MAX_TRACKED_TOKENS` | 20 | bounds the inheritance sweep |
| `BPS_DENOMINATOR` | 10 000 | heir shares are basis points and must sum to exactly this |
| `MIN/MAX_INACTIVITY_PERIOD` | 1 day / 3650 days | |
| `MIN/MAX_REQUEST_TTL` | 1 hour / 30 days | |
| `CONFIG_DELAY` | 2 days | timelock on configuration changes |
| `RECOVERY_DELAY` | 2 days | timelock on owner rotation |
| `INHERITANCE_NOTICE` | 2 days | grace window before heirs are paid |

Validation rejects the zero address, duplicates, and any guardian or heir equal to the
owner. Threshold must be `1 ≤ M ≤ N`.

### 4.3 Withdrawals — owner proposes, guardians decide

```
requestWithdrawal ──▶ Pending ──approvals ≥ M──▶ Executed   (pays out in the same tx)
                        │
                        ├── owner cancelWithdrawal ──▶ Cancelled
                        ├── rejections > N − M ─────▶ Rejected
                        └── now > createdAt + TTL ──▶ Expired (a view flag, not a state)
```

Two details that matter:

- **A single guardian cannot veto.** A request only dies when reaching the threshold
  has become *arithmetically impossible* — `rejections > N − M`. In a 2-of-3 vault one
  rejection changes nothing; two kill it. Vaultix cancelled on the first rejection,
  which handed every guardian a unilateral veto.
- **Execution is automatic.** The approval that reaches the threshold performs the
  transfer inside the same transaction (`approveWithdrawal` is `nonReentrant`). There
  is no separate execute step to forget.

Multiple requests can be pending at once. The owner can always cancel their own.

### 4.4 Inheritance — dividend accounting behind a notice

**Amounts.** No snapshots. Per token:

```
entitled(heir)  = (currentBalance + totalClaimed) × shareBps / 10000
payout(heir)    = entitled − alreadyClaimed(heir)          (clamped to the balance)
```

Consequences: funds arriving after the first claim still split correctly; claiming
twice pays only the delta; claiming with nothing new reverts `NothingToClaim`. This is
the bug that made the rebuild worth doing — Vaultix snapshotted at first claim and paid
every late deposit to whoever claimed last.

**Timing.** A timer is a bad judge of death. An owner in hospital, travelling without
their seed, or simply forgetful would otherwise be drained with no warning. So claiming
is two steps:

```
                inactivityPeriod elapsed
                          │
      heir: announceInheritance()   ──▶  notice running (48h)
                          │                    │
                          │        owner proof of life ──▶ announcement void
                          │
              notice elapsed ──▶ claimInheritance / claimAllInheritance
```

The invalidation rule is the part worth reading twice. The announcement is stored as a
timestamp, not a flag, and only counts while

```solidity
inheritanceAnnouncedAt >= lastAlive + inactivityPeriod
```

Every proof of life already calls `_touch()`, which sets `lastAlive = now` and so pushes
the unlock date past any existing announcement. A heartbeat, a deposit, a withdrawal
request or a recovery veto therefore all void a pending claim **for free** — no extra
state, no cancel function, and no code path that can forget to do it.

Guardians deliberately **cannot** veto a claim. If they could, a colluding majority
could strand an inheritance forever, which is the exact failure this product exists to
prevent. Only the owner's own liveness stops the clock.

**Two views, on purpose.** `claimableInheritance` returns 0 until the notice has run, so
the UI never offers a claim the vault would reject. `pendingInheritance` ignores the
notice and returns the entitlement, so the heir can see what they are owed while the
countdown runs instead of staring at a zero.

### 4.5 Tracked tokens — a bounded, adversarial resource

`claimAllInheritance` iterates the tracked-token list, so that list is an attack
surface. Anyone able to fill its 20 slots with junk blocks real tokens from ever being
tracked; anyone able to insert one token that reverts on `balanceOf` or `transfer`
takes the whole sweep down with it and strands every other asset permanently.

Four defences:

1. `trackToken` is restricted to stakeholders (owner, guardians, heirs).
2. Balance reads go through `_tokenBalanceSafe`, which returns `(0, false)` instead of
   reverting — a misbehaving token is worth zero, not fatal.
3. `_sweep` writes the accounting, attempts the transfer, and **rolls the accounting
   back** if it fails, emitting `InheritanceClaimSkipped`. A bad leg leaves no trace and
   stays retryable.
4. `untrackToken` frees a slot, but only for a token the vault holds none of — so it can
   never be used to hide assets from heirs.

Single-token `claimInheritance` still reverts loudly: there the caller chose the token
and deserves the error.

Non-standard ERC20s are handled: `_safeCallToken` accepts tokens that return no data
(USDT-style) and rejects those that return an explicit `false`.

### 4.6 Social recovery — for the lost key

```
guardian proposeRecovery(newOwner)   → proposal with 1 approval (the proposer's)
guardian approveRecovery(id)         → until approvals ≥ threshold
                                       ↓  and 48h elapsed
anyone   executeRecovery(id)         → owner = newOwner
owner    vetoRecovery(id)            → kills it at any point during the lock
```

The veto is the elegant part: if you can veto, your key is obviously not lost, which is
exactly the claim the recovery is making. The veto also counts as proof of life.

`newOwner` cannot be an existing guardian or heir. Executing a rotation bumps
`minValidRequestId` and `minValidRecoveryId` past everything outstanding and deletes any
pending config, because all of it was created under a key that is no longer trusted.

### 4.7 Configuration changes — two-phase, guardian-vetoable

If a compromised key could instantly swap guardians, every other guardrail would be
decoration. So `proposeConfig` (guardians, threshold, heirs, shares, periods) waits
`CONFIG_DELAY`, and `threshold` guardians vetoing kills it. The owner can cancel their
own proposal; anyone can `applyConfig` once it matures, since it only does what the
owner proposed and the guardians did not block.

Applying also bumps `minValidRequestId` / `minValidRecoveryId`, so approvals cast by the
old guardian set cannot be replayed under the new one.

Only one proposal can be pending at a time.

### 4.8 Role discovery, and why the registry calls back

The factory indexes which vaults each address relates to, so the frontend can answer
"which vaults am I part of?" in one call.

Originally that index was written only at creation. That looked like harmless staleness
and was not: after `executeRecovery`, the address that now controls the vault appeared
in no index at all, so the recovered owner opened the app and **saw nothing**. The
flagship feature worked on-chain and was unreachable through the product.

Now `applyConfig` and `executeRecovery` call `factory.syncRoles(...)`, passing both the
old and the new sets so the factory rebuilds the difference and the vault stays free of
set arithmetic. Guards:

- only a registered vault may call it, and a vault can only ever move its own entries;
- the call is wrapped in `try/catch` — the registry is a convenience index and must
  never be able to block a recovery guardians already approved;
- entries are removed with swap-and-pop, so **list order is not stable**. Membership is
  exact; nothing should depend on ordering.

As a second escape hatch the UI can open any vault by address. The index is a shortcut;
the vault is the truth.

### 4.9 Reentrancy and transfer safety

`nonReentrant` guards every path that moves value out: `approveWithdrawal` (which may
execute), `claimInheritance`, `claimAllInheritance`. Checks-effects-interactions is
followed everywhere except the deliberate rollback in `_sweep`, which is safe because it
happens after a *failed* call, inside the guard. Custom errors throughout; no external
dependencies in the contracts at all.

---

## 5. Frontend

Next.js 15 (App Router) + wagmi v2 + viem + Tailwind v4. No backend, no API routes, no
database. Every number on screen is read from the chain.

| Route | Purpose |
|---|---|
| `/` | Landing: the three failure modes and how each is handled |
| `/app` | Role-aware dashboard — the whole product |
| `/preview` | Design preview with mocked data, for iterating on visuals without a chain |

**Role derivation.** `/app` reads the factory's three indexes to find candidate vaults,
then reads `summary()` on the active one and derives `isOwner` / `isGuardian` / `isHeir`
by comparing addresses **against the vault**, never against the registry. A stale index
entry can therefore show a vault chip but can never grant an action.

**One call per vault.** `summary()` returns owner, guardians, threshold, heirs, shares,
periods, `lastAlive`, native balance, tracked tokens, request and recovery counters, the
stale-id watermarks, the inheritance unlock/announce/claimable state, and whether a
config change is pending — in a single `eth_call`.

| Component | Shown to | Does |
|---|---|---|
| `owner-panel` | owner | balance, heartbeat, native deposit, withdrawal request, trust network, tracked tokens with untrack |
| `token-deposit` | owner | ERC20 deposit: reads `decimals`, approves if needed, then `depositToken` |
| `guardian-panel` | guardian | context on the vault being protected |
| `heir-panel` | heir | share, entitlement per asset, announce → notice countdown → claim |
| `requests` | owner + guardians | withdrawal list, approve / reject / cancel |
| `recovery` | owner + guardians | propose / approve / execute / veto rotation |
| `config-panel` | owner + guardians | propose / cancel / veto / apply a config change |
| `role-form` | shared | the guardians+heirs+periods form, used by both create-vault and config-panel so validation lives in one place |

**Hooks worth knowing:**

- `useChainNow` — every deadline is enforced against `block.timestamp`, so counting down
  with `Date.now()` shows the wrong number to anyone whose system clock is off, and
  drifts by days on a time-warped dev chain. This anchors to the latest block and ticks
  locally between blocks.
- `useTokenMeta` — multicalls `symbol` + `decimals` for tracked tokens. Amounts are
  never parsed with a hardcoded 18; a USDT-style 6-decimal token would otherwise move a
  million times too much or too little.
- `useTx` — runs a write, waits for the receipt, then invalidates every on-chain query so
  panels refresh immediately instead of waiting for the poll interval.

---

## 6. Tests

`cd contracts && npm test` → **50 passing**, grouped by concern:

| Group | Covers |
|---|---|
| factory | clone independence, discovery indexes, registry sync after recovery and after config, `syncRoles` access control, initialization guards, invalid configs |
| deposits & proof of life | who resets the clock and who does not, ERC20 pull deposits |
| withdrawals | auto-execution at threshold, the rejection arithmetic, cancel, concurrency, TTL expiry, voting rules, ERC20 path, balance checks |
| inheritance | announcement required, notice must elapse, heartbeat voids a live notice, notice cannot be restarted, 60/40 split, dividend accounting with late deposits, double-claim, sweep, access control, view semantics |
| tracked tokens | stakeholder-only tracking, untrack with and without a balance, swap-and-pop correctness, hostile token on `transfer`, hostile token on `balanceOf` |
| social recovery | threshold + timelock, owner veto, invalidation of old requests, role conflicts |
| config changes | timelock, guardian veto, invalidation, one-at-a-time |
| summary | aggregate shape for the UI |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) compiles and tests the
contracts and builds the web app on every push and PR.

---

## 7. Status and honest gaps

**Deployed:** local hardhat only. `contracts/deployments/` contains `localhost.json`.
A BSC Testnet deploy is configured (`npm run deploy:bscTestnet`, chain 97, faucet at
https://testnet.bnbchain.org/faucet-smart) but has not been run.

**Not built, and why it matters:**

- **Nobody tells you the clock is running.** The whole model rests on the owner
  heartbeating, and with no backend there is no reminder. The 48h notice softens the
  failure but does not remove it. A signed `heartbeatFor` that a keeper could relay, or
  a calendar export at vault creation, would.
- **No static analysis in CI.** Slither, fuzzing and invariant tests are the obvious
  next step for a contract that custodies funds. 50 unit tests are the floor, not the
  ceiling. No audit.
- **No NFTs.** Inheritance covers the native coin and ERC20s. An ERC721 sent to a vault
  is stuck.
- **No transaction history.** Every action emits an event and nothing reads them back.
- **Vault spam.** `createVault` accepts any owner, guardians and heirs, so anyone can
  put your address in a vault you never agreed to and it will appear in your list.
  Roles are still checked against the vault, so it is noise rather than risk.
- **Fee-on-transfer tokens.** Inheritance accounting records the amount sent, not the
  amount received, so a skimming token under-pays later claimants.
- **Rounding dust.** Basis-point division floors; the remainder stays in the vault.
  Negligible for 18-decimal assets.

---

## 8. Gotchas when working on this

- **Never run `npm run build` in `web/` while the dev server is running.** They share
  `.next` and the build leaves the dev server serving broken chunks. Restart it after.
- **Do not edit source while an automated browser run is driving the app.** HMR swaps
  the component mid-interaction and the run fails in a way that looks like a product
  bug.
- `deploy.ts` prints the factory address; it does not write `.env.local`. Copy it.
- Changing `VaultSummary` means: `npm run sync-abi` **and** editing
  `web/src/lib/types.ts` **and** the mock in `web/src/app/preview/page.tsx`.
- On a chain where you have used `evm_increaseTime`, chain time runs ahead of the
  browser. That is expected; `useChainNow` is what keeps the countdowns honest.
