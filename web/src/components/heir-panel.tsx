"use client";

import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { bpsToPercent, formatDuration, formatTokenAmount, shortAddress } from "@/lib/format";
import { metaFor, useTokenMeta } from "@/lib/tokens";
import { sameAddress, type VaultSummary } from "@/lib/types";
import { useChainNow } from "@/lib/useChainNow";
import { useTx } from "@/lib/useTx";
import { MoonWatch } from "./moon-phase";
import { Badge, Button, Card, ErrorText, Mono, Stat } from "./ui";

export function HeirPanel({
  vault,
  summary,
}: {
  vault: `0x${string}`;
  summary: VaultSummary;
}) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { send, pending, error } = useTx();
  const now = useChainNow();

  const heirIndex = summary.heirs.findIndex((heir) => sameAddress(heir, address));
  const shareBps = heirIndex >= 0 ? summary.shares[heirIndex] : 0;

  const tokens: `0x${string}`[] = [ZERO_ADDRESS, ...summary.trackedTokens];
  const tokenMeta = useTokenMeta(summary.trackedTokens);

  // `pendingInheritance` ignores the notice window, so the heir can see what they
  // are owed while the countdown runs instead of staring at a zero.
  const { data: entitlements } = useReadContracts({
    contracts: tokens.map((token) => ({
      address: vault,
      abi: midnightVaultAbi,
      functionName: "pendingInheritance" as const,
      args: [address ?? ZERO_ADDRESS, token] as const,
    })),
    query: { enabled: !!address },
  });

  const amountFor = (index: number) =>
    entitlements?.[index]?.status === "success" ? (entitlements[index].result as bigint) : 0n;

  const nativeEntitlement = amountFor(0);
  const anythingOwed = tokens.some((_, index) => amountFor(index) > 0n);

  const announced = summary.inheritanceAnnouncedAt > 0n;
  const claimableIn = Number(summary.inheritanceClaimableAt) - now;

  const periodDays = Math.round(Number(summary.inactivityPeriod) / 86_400);
  const periodLabel = `${periodDays} ${periodDays === 1 ? "day" : "days"}`;

  return (
    <Card
      title="Inheritance"
      subtitle={`Your share: ${bpsToPercent(shareBps)}. Claims use dividend accounting — late deposits still split correctly.`}
    >
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <MoonWatch
          lastAlive={Number(summary.lastAlive)}
          period={Number(summary.inactivityPeriod)}
          unlockedOnChain={summary.inheritanceUnlocked}
        />
        <Stat
          label={summary.inheritanceClaimable ? "Claimable now (native)" : "Your share (native)"}
          value={formatTokenAmount(nativeEntitlement, 18, "tBNB")}
        />
      </div>

      {summary.trackedTokens.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {summary.trackedTokens.map((token, index) => {
            const meta = metaFor(tokenMeta, token, ZERO_ADDRESS);
            return (
              <li key={token} className="flex items-center gap-2 text-sm text-ink-muted">
                <Mono>{shortAddress(token)}</Mono>
                <span>{formatTokenAmount(amountFor(index + 1), meta.decimals, meta.symbol)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5 space-y-3">
        {!summary.inheritanceUnlocked ? (
          <p className="text-xs text-ink-faint">
            The owner is still active. Claims unlock only after {periodLabel} without proof of
            life.
          </p>
        ) : !announced ? (
          <>
            <Button
              busy={pending === "announce"}
              onClick={() =>
                send("announce", () =>
                  writeContractAsync({
                    address: vault,
                    abi: midnightVaultAbi,
                    functionName: "announceInheritance",
                  })
                )
              }
            >
              Announce the claim
            </Button>
            <p className="text-xs text-ink-faint">
              Starts a 48h notice. If the owner is simply unreachable rather than gone, a single
              heartbeat from them cancels it — nothing moves without that warning.
            </p>
          </>
        ) : !summary.inheritanceClaimable ? (
          <>
            <Badge tone="warn">Notice served — claimable in {formatDuration(claimableIn)}</Badge>
            <p className="text-xs text-ink-faint">
              The owner can still stop this by proving they are alive.
            </p>
          </>
        ) : (
          <Button
            disabled={!anythingOwed}
            busy={pending === "claim-all"}
            onClick={() =>
              send("claim-all", () =>
                writeContractAsync({
                  address: vault,
                  abi: midnightVaultAbi,
                  functionName: "claimAllInheritance",
                })
              )
            }
          >
            Claim everything
          </Button>
        )}
      </div>
      <ErrorText message={error} />
    </Card>
  );
}
