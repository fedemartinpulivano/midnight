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
drift because there is no second copy of the state. Discovery (which vaults am I
part of?) comes from the factory registry; per-vault roles are always re-derived
from the vault itself, so registry staleness after config changes is harmless.

## 7. Honest visibility

`getBalance()` being owner-only in Vaultix protected nothing (contract balances
are public on any explorer) and actively broke the guardian/heir UIs. Midnight
exposes everything relevant through public views and documents that on-chain
balances are public by nature.

## Known trade-offs

- **Registry staleness**: the factory's role index isn't updated on config
  changes/rotations — by design (see §6). A subgraph would fix discovery for
  removed members; out of scope here.
- **Bounded token list**: inheritance sweeps at most 20 tracked tokens to bound
  gas. Untracked tokens can always be rescued via `trackToken` + guardian-approved
  withdrawal.
- **Rounding dust**: bps division floors; dust stays in the vault. With 18-decimal
  assets this is negligible (< 10⁻¹⁴ of any balance).
- **No owner-initiated instant withdrawals**: everything goes through guardians.
  That's the product: if the owner key alone could move funds, a thief's key could
  too.
