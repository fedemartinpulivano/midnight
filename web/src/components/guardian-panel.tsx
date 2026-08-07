"use client";

import { formatAmount } from "@/lib/format";
import type { VaultSummary } from "@/lib/types";
import { Card, Stat } from "./ui";
import { Countdown } from "./countdown";

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
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Stat label="Vault balance" value={formatAmount(summary.nativeBalance)} />
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
            Owner inactivity timer
          </p>
          <Countdown target={Number(summary.inheritanceUnlocksAt)} />
        </div>
      </div>
    </Card>
  );
}
