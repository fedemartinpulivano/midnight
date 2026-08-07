"use client";

import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { bpsToPercent, formatAmount, shortAddress } from "@/lib/format";
import { sameAddress, type VaultSummary } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { MoonWatch } from "./moon-phase";
import { Button, Card, ErrorText, Mono, Stat } from "./ui";

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

  const heirIndex = summary.heirs.findIndex((heir) => sameAddress(heir, address));
  const shareBps = heirIndex >= 0 ? summary.shares[heirIndex] : 0;

  const tokens: `0x${string}`[] = [ZERO_ADDRESS, ...summary.trackedTokens];
  const { data: claimables } = useReadContracts({
    contracts: tokens.map((token) => ({
      address: vault,
      abi: midnightVaultAbi,
      functionName: "claimableInheritance" as const,
      args: [address ?? ZERO_ADDRESS, token] as const,
    })),
    query: { enabled: !!address },
  });

  const nativeClaimable =
    claimables?.[0]?.status === "success" ? (claimables[0].result as bigint) : 0n;
  const anythingClaimable =
    claimables?.some(
      (entry) => entry.status === "success" && (entry.result as bigint) > 0n
    ) ?? false;

  return (
    <Card
      title="Inheritance"
      subtitle={`Your share: ${bpsToPercent(shareBps)}. Claims use dividend accounting — late deposits still split correctly.`}
    >
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <MoonWatch
          lastAlive={Number(summary.lastAlive)}
          period={Number(summary.inactivityPeriod)}
        />
        <Stat label="Claimable now (native)" value={formatAmount(nativeClaimable)} />
      </div>

      {summary.trackedTokens.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {summary.trackedTokens.map((token, index) => {
            const entry = claimables?.[index + 1];
            const value = entry?.status === "success" ? (entry.result as bigint) : 0n;
            return (
              <li key={token} className="flex items-center gap-2 text-sm text-ink-muted">
                <Mono>{shortAddress(token)}</Mono>
                <span>{formatAmount(value, "tokens")}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5">
        <Button
          disabled={!summary.inheritanceUnlocked || !anythingClaimable}
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
        {!summary.inheritanceUnlocked ? (
          <p className="mt-2 text-xs text-ink-faint">
            The owner is still active. Claims unlock only after{" "}
            {Math.round(Number(summary.inactivityPeriod) / 86_400)} days without proof of life.
          </p>
        ) : null}
      </div>
      <ErrorText message={error} />
    </Card>
  );
}
