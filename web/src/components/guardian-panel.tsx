"use client";

import { formatAmount } from "@/lib/format";
import type { VaultSummary } from "@/lib/types";
import { Card, Stat } from "./ui";
import { MoonWatch } from "./moon-phase";

/// Guardian actions live in RequestsCard / RecoveryCard; this panel gives the
/// guardian context about the vault they protect (no private data — everything
/// here is public on-chain anyway, unlike Vaultix's fake owner-only getBalance).
export function GuardianPanel({
  summary,
}: {
  vault: `0x${string}`;
  summary: VaultSummary;
}) {
  return (
    <Card
      title="Guardian duty"
      subtitle={`You are one of ${summary.guardians.length} guardians. ${summary.threshold.toString()} approvals execute a withdrawal.`}
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <Stat label="Vault balance" value={formatAmount(summary.nativeBalance)} />
        <MoonWatch
          lastAlive={Number(summary.lastAlive)}
          period={Number(summary.inactivityPeriod)}
          size={48}
        />
      </div>
    </Card>
  );
}
