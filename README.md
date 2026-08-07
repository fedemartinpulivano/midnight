<h1 align="center">🌑 Midnight</h1>

<p align="center">
  <strong>The vault that survives you.</strong>
</p>

<p align="center">
  Non-custodial recovery vault: M-of-N guardian approvals, weighted inheritance after inactivity,<br/>
  and social recovery of lost keys — enforced entirely on-chain.
</p>

<p align="center">
  <img alt="Solidity" src="https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity" />
  <img alt="Hardhat" src="https://img.shields.io/badge/Hardhat-2.x-FFF100?logo=hardhat" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs" />
  <img alt="wagmi" src="https://img.shields.io/badge/wagmi-v2-1C1B1F" />
  <img alt="BSC Testnet" src="https://img.shields.io/badge/BSC_Testnet-97-F0B90B?logo=binance" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

Midnight is a ground-up rebuild of [Vaultix](https://github.com/MartinPuli/repoHackItba) (HackITBA 2026). Same mission — protect crypto against **stolen keys, lost keys and death** — but redesigned from zero with the lessons learned.

## Why a rebuild? Vaultix → Midnight

| # | Vaultix (hackathon) | Midnight |
|---|---------------------|----------|
| 1 | 3 full contracts deployed per user (`StrongBox` + `Guardian` + `Heir`) | **1 EIP-1167 minimal proxy clone** per user (~10x cheaper deploys) |
| 2 | Exactly 2 guardians, 2-of-2 approval — one guardian offline freezes funds forever | **M-of-N configurable threshold** (e.g. 2-of-3): liveness AND security |
| 3 | A single guardian rejection kills a withdrawal (unilateral veto) | Rejection only kills a request when it **mathematically can't reach threshold** |
| 4 | Owner cannot cancel their own withdrawal request | Owner can **cancel**, requests **expire after a TTL**, multiple concurrent requests |
| 5 | Inheritance hardcoded 50/50 with a buggy snapshot (late deposits all go to the 2nd claimer) | **Weighted shares in basis points** + dividend-style accounting: late deposits split exactly, double-claims pay only the delta |
| 6 | Lost owner key = wait for the inheritance timer, funds unusable meanwhile | **Social recovery**: guardians rotate ownership behind a 48h timelock the real owner can veto |
| 7 | Guardians/heirs can never be changed | **Two-phase config changes** (48h timelock + guardian veto) — a stolen key can't silently swap your guardians |
| 8 | Only deposits/withdrawals reset the inactivity timer (you must move money to stay "alive") | Free **`heartbeat()`** proof-of-life ping |
| 9 | `getBalance()` restricted to owner — pointless (balances are public on-chain) and breaks guardian/heir UIs | Honest **public views** + one `summary()` call optimized for the frontend |
| 10 | Separate near-duplicate contract for ERC20 (`StrongBoxERC20`) | **One vault handles native + any ERC20** (USDT-style non-standard tokens included) |
| 11 | Express + Supabase backend with a **mocked** chain balance service | **Zero backend.** The frontend reads the chain directly; the contract is the only source of truth |
| 12 | Config changes / role state could drift between DB and chain | Nothing to drift — stale approvals are auto-invalidated on-chain after config/owner changes |
| 13 | Inheritance fires the instant the timer expires | **48h claim notice**: an heir announces, and any proof of life from the owner voids it — being unreachable for a month no longer costs you the vault |

## Architecture

```
midnight/
├── contracts/            Hardhat + TypeScript
│   ├── contracts/
│   │   ├── MidnightVault.sol      ← all vault logic (initializer-based, clonable)
│   │   ├── MidnightFactory.sol    ← EIP-1167 clones + role discovery registry
│   │   └── mocks/                 ← MockERC20 + HostileERC20 (reverts on purpose)
│   ├── test/MidnightVault.test.ts (50 tests)
│   └── scripts/deploy.ts · demo-local.ts · export-abi.mjs
└── web/                  Next.js 15 + wagmi v2 + viem + Tailwind v4
    └── src/app           /        landing
                          /app     role-aware dashboard (owner / guardian / heir)
                          /preview design preview with mocked data
```

[CLAUDE.md](CLAUDE.md) documents the mechanism in full — state machines, invariants,
and the known gaps.

```
                        MidnightFactory ──creates──▶ EIP-1167 clone
                                                          │
                        ┌─────────────────────────────────┤
                        ▼                                 ▼
                 MidnightVault (per user)          implementation (shared, locked)
                        │
     ┌──────────────────┼──────────────────────┐
     ▼                  ▼                      ▼
   OWNER            GUARDIANS (N)           HEIRS (bps shares)
   deposit           approve/reject          claim after inactivity
   request/cancel    social recovery         dividend-style accounting
   heartbeat         veto bad configs
```

### Security model

- **Stolen key** → attacker can request withdrawals, but M guardians must approve. They can propose a malicious config or drain attempt; guardians see it and veto / reject. Every config change waits 48h.
- **Lost key** → guardians propose `proposeRecovery(newOwner)`; after M approvals + 48h timelock, ownership rotates. If the "lost" key was actually stolen chatter, the real owner vetoes during the timelock.
- **Death / incapacity** → after `inactivityPeriod` without proof of life, an heir calls `announceInheritance()` and a 48h notice starts. Once it elapses, heirs claim pro-rata shares of native + every tracked ERC20. Claims use dividend accounting (`entitled = (balance + totalClaimed) × bps / 10000 − alreadyClaimed`), so late-arriving funds still split correctly.
- **Alive but unreachable** → the notice exists because a timer alone is a bad judge of death. Any proof of life during the window — a heartbeat, a deposit, a withdrawal request — pushes the unlock date past the announcement and silently voids it. Guardians deliberately *cannot* veto a claim, so they can never trap an inheritance forever.
- **Hostile tokens** → the tracked-token list is a bounded resource, so only stakeholders can add to it, empty entries can be untracked, and `claimAllInheritance` skips a token that reverts instead of letting it strand the rest of the estate.
- **Replay safety** → executing a recovery or applying a config bumps `minValidRequestId` / `minValidRecoveryId`, invalidating everything approved under the old trust set.
- Reentrancy guards on every transfer path, checks-effects-interactions, custom errors, no external dependencies in the contracts.

## Quickstart

### Contracts

```bash
cd contracts
npm install
npm test                 # 50 passing
```

Deploy to BSC Testnet (needs `PRIVATE_KEY` in `contracts/.env`, faucet: https://testnet.bnbchain.org/faucet-smart):

```bash
npm run deploy:bscTestnet
```

### Web app

```bash
cd web
npm install
cp .env.example .env.local    # paste the factory address from the deploy output
npm run dev
```

Open http://localhost:3000 — connect MetaMask on BSC Testnet (chain id 97).

Regenerate the typed ABI after contract changes:

```bash
cd contracts && npm run compile && npm run sync-abi
```

## Contract API (short version)

| Role | Function | Effect |
|------|----------|--------|
| anyone | `receive()` / `depositToken(token, amount)` | fund the vault (owner deposits refresh proof of life) |
| stakeholder | `trackToken(token)` / `untrackToken(token)` | manage which ERC20s heirs inherit (untrack only when empty) |
| owner | `heartbeat()` | free proof-of-life ping |
| owner | `requestWithdrawal(token, to, amount)` / `cancelWithdrawal(id)` | manage withdrawal requests |
| guardian | `approveWithdrawal(id)` / `rejectWithdrawal(id)` | vote; auto-executes at threshold |
| heir | `announceInheritance()` | start the 48h claim notice after inactivity |
| heir | `claimInheritance(token)` / `claimAllInheritance()` | claim shares once the notice has elapsed |
| guardian | `proposeRecovery(newOwner)` / `approveRecovery(id)` | rotate a lost key (48h timelock) |
| owner | `vetoRecovery(id)` | prove the key isn't lost |
| owner | `proposeConfig(...)` / `cancelConfig()` | two-phase config change (48h) |
| guardian | `vetoConfig()` | block a malicious config at threshold vetoes |
| anyone | `applyConfig()` / `executeRecovery(id)` | apply matured proposals |
| anyone | `summary()` | aggregated state for UIs in one call |

Applying a config or executing a recovery calls back into the factory's `syncRoles`, so the discovery index follows the roles instead of freezing at creation time — a recovered owner finds their vault, a removed guardian stops seeing it. The frontend can also open any vault by address, since the index is a convenience and the vault is the source of truth.

## License

MIT
