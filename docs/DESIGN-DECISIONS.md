# Design decisions

Why Midnight looks the way it does — and what it deliberately changed from Vaultix
(the HackITBA 2026 predecessor).

## 1. One clonable vault instead of three contracts

Vaultix deployed `StrongBox` + `Guardian` + `Heir` per user. The `Guardian`/`Heir`
contracts were pure address registries — an expensive way to store 4 addresses.

Midnight keeps every role inside a single `MidnightVault` and deploys it as an
EIP-1167 minimal proxy. The factory deploys the implementation once; each user pays
only for a 45-byte proxy plus initialization storage.

Consequence: the vault uses an `initialize()` guarded by an `_initialized` flag
(set in the constructor for the implementation itself, so it can never be hijacked).

## 2. M-of-N guardians

2-of-2 has two failure modes:

- **Liveness**: one guardian loses their key → funds frozen forever.
- **Veto**: Vaultix cancelled a request on the *first* rejection → one malicious
  guardian could block every withdrawal.

Midnight stores a guardian set (≤10) plus a threshold. A request is rejected only
when `rejections > N − threshold`, i.e. when reaching the threshold has become
mathematically impossible. Approval at the threshold executes immediately.

## 3. Dividend-style inheritance

Vaultix snapshotted the balance at the first claim and hardcoded 50/50. Deposits
arriving after the snapshot were paid entirely to whichever heir claimed last —
an accounting bug, not a design choice.

Midnight tracks, per token:


```
entitled(heir)  = (balance + totalClaimed) × shareBps / 10000
payout(heir)    = entitled − alreadyClaimed(heir)
```

Properties:
- shares are arbitrary basis points (60/40, 50/30/20, …) validated to sum 10000;
- late deposits split correctly with no snapshot bookkeeping;
- claiming twice pays only the delta; claiming with nothing new reverts;
- works identically for native coin and every tracked ERC20.

## 3b. A notice period before heirs are paid

Dividend accounting solves *how much* each heir gets. It says nothing about *when*,
and the original answer — the instant `lastAlive + inactivityPeriod` passes — treats
a timer as a reliable death certificate. It isn't. An owner in hospital, travelling
without their seed, or simply forgetful would be drained with no warning and no
recourse. Every other irreversible path in this contract has a human check;
inheritance was the one that didn't.

So a claim is now two steps: an heir calls `announceInheritance()`, and payouts
open `INHERITANCE_NOTICE` (48h) later.

The invalidation rule is the part worth reading twice. The announcement is stored
as a timestamp, not a flag, and only counts while

```
inheritanceAnnouncedAt >= lastAlive + inactivityPeriod
```

Every proof of life already calls `_touch()`, which moves `lastAlive` to now and
pushes the unlock date past any existing announcement. So a heartbeat, a deposit, a
withdrawal request or a recovery veto all cancel a pending claim for free — no
extra state, no cancellation function, and no code path that can forget to do it.

Guardians deliberately **cannot** veto a claim. Giving them that power would let a
majority strand an inheritance forever, which is the exact failure this product
exists to prevent. Only the owner's own liveness stops the clock.

## 3c. The tracked-token list is a bounded resource

`claimAllInheritance` iterates the tracked tokens, and anyone could once add to
that list. Two consequences, both cheap to trigger: fill the 20 slots with junk and
no real token can be tracked again; include one token whose `balanceOf` or
`transfer` reverts and the whole sweep reverts with it, stranding every other asset
permanently.

Fixes, in order of importance:

- balance reads go through `_tokenBalanceSafe`, so a misbehaving token is worth
  zero rather than fatal;
- the sweep writes accounting first, attempts the transfer, and rolls the
  accounting back on failure — a bad leg leaves no trace and stays retryable;
- `trackToken` is restricted to stakeholders, and `untrackToken` frees a slot for
  any token the vault holds none of (never one holding a balance, so it can't be
  used to hide assets from heirs).

Single-token `claimInheritance` still reverts loudly: there the caller chose the
token and deserves the error.

## 4. Social recovery with an owner veto

The single worst outcome in Vaultix: lose your key and your funds are stuck until
the inactivity timer fires — and even then they go to heirs, not to you.

Midnight lets guardians rotate ownership to a fresh address. Safety valves:

- needs `threshold` guardian approvals;
- 48h timelock before execution;
- the current owner can veto at any point during the lock (if you can veto, the
  key obviously isn't lost — which is exactly the point);
- executing a rotation invalidates every pending request and other proposal, since
  they were created under a now-distrusted key.

## 5. Two-phase config changes

If a compromised owner key could instantly replace guardians, every other guard
rail would be decoration. Config changes (guardians, threshold, heirs, shares,
periods) are proposed, wait 48h, and can be vetoed by `threshold` guardians.
Applying a config also invalidates pending requests/proposals so approvals cast
under the old trust set can't be replayed under the new one.

## 6. No backend

Vaultix shipped an Express + Supabase backend whose chain-balance service was
mocked — the UI displayed database numbers, not chain state. Any drift between the
two was invisible to users.

Midnight has no server at all. The wagmi frontend reads `summary()` (one
aggregated call designed for this) and writes transactions directly. Nothing can
drift because there is no second copy of the state.

Discovery (which vaults am I part of?) comes from the factory registry, and roles
are always re-derived from the vault itself before any action is offered. The
registry used to be written only at creation, which was described as harmless
staleness. It wasn't: after `executeRecovery`, the address that now controls the
vault appeared in no index at all, so the recovered owner opened the app and saw
nothing. The feature worked on-chain and was unreachable through the product.

Vaults therefore call back into `syncRoles` when `applyConfig` or `executeRecovery`
moves roles. The vault passes both the old and the new sets and the factory rebuilds
the difference, which keeps set arithmetic out of the vault. The call is wrapped in
`try/catch`: the registry is a convenience index and must never be able to block a
recovery that guardians already approved. As a second escape hatch, the frontend can
open any vault by address — the index is a shortcut, not the source of truth.

## 7. Honest visibility

`getBalance()` being owner-only in Vaultix protected nothing (contract balances
are public on any explorer) and actively broke the guardian/heir UIs. Midnight
exposes everything relevant through public views and documents that on-chain
balances are public by nature.

## Known trade-offs

- **Nobody tells you the clock is running.** The whole model rests on the owner
  heartbeating, and with no backend there is no reminder. The 48h notice softens
  the failure but doesn't remove it; a signed `heartbeatFor` that a keeper could
  relay, or a calendar export at vault creation, would.
- **Registry ordering**: `syncRoles` removes with swap-and-pop, so a member's vault
  list can reorder after someone else's config change. Membership is exact; order
  is not stable and the UI must not depend on it.
- **Bounded token list**: inheritance sweeps at most 20 tracked tokens to bound
  gas. Untracked tokens can always be rescued via `trackToken` + guardian-approved
  withdrawal, and `untrackToken` reclaims slots held by empty entries.
- **Fee-on-transfer tokens**: inheritance accounting records the amount sent, not
  the amount received, so a token that skims on transfer will under-pay later
  claimants. Not handled; document it before listing such a token.
- **Rounding dust**: bps division floors; dust stays in the vault. With 18-decimal
  assets this is negligible (< 10⁻¹⁴ of any balance).
- **No owner-initiated instant withdrawals**: everything goes through guardians.
  That's the product: if the owner key alone could move funds, a thief's key could
  too.
