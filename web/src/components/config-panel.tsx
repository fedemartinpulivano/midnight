"use client";

import { useMemo, useState } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { bpsToPercent, formatDuration, shortAddress } from "@/lib/format";
import type { PendingConfigData, VaultSummary } from "@/lib/types";
import { useChainNow } from "@/lib/useChainNow";
import { useTx } from "@/lib/useTx";
import {
  RoleForm,
  toContractRoles,
  validateRoles,
  type RoleFormValue,
} from "./role-form";
import { Badge, Button, Card, ErrorText, Mono } from "./ui";

function summaryToForm(summary: VaultSummary): RoleFormValue {
  return {
    guardians: [...summary.guardians],
    threshold: summary.threshold.toString(),
    heirs: summary.heirs.map((heir, index) => ({
      address: heir,
      percent: ((summary.shares[index] ?? 0) / 100).toString(),
    })),
    inactivityDays: (Number(summary.inactivityPeriod) / 86_400).toString(),
    ttlDays: (Number(summary.requestTTL) / 86_400).toString(),
  };
}

export function ConfigPanel({
  vault,
  summary,
  role,
}: {
  vault: `0x${string}`;
  summary: VaultSummary;
  role: { isOwner: boolean; isGuardian: boolean };
}) {
  const { writeContractAsync } = useWriteContract();
  const { send, pending, error } = useTx();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RoleFormValue>(() => summaryToForm(summary));
  const [formError, setFormError] = useState<string | null>(null);
  const now = useChainNow();

  const { data } = useReadContract({
    address: vault,
    abi: midnightVaultAbi,
    functionName: "getPendingConfig",
    query: { enabled: summary.hasPendingConfig },
  });

  const proposal = data as unknown as PendingConfigData | undefined;

  const matured = useMemo(() => {
    if (!proposal?.[0]) return false;
    return now >= Number(proposal[7]);
  }, [proposal, now]);

  async function propose() {
    const problem = validateRoles(form, summary.owner);
    setFormError(problem);
    if (problem) return;

    const roles = toContractRoles(form);
    await send("propose-config", () =>
      writeContractAsync({
        address: vault,
        abi: midnightVaultAbi,
        functionName: "proposeConfig",
        args: [
          roles.guardians,
          roles.threshold,
          roles.heirs,
          roles.shares,
          roles.inactivityPeriod,
          roles.requestTTL,
        ],
      })
    );
    setShowForm(false);
  }

  function simpleAction(key: string, functionName: "cancelConfig" | "vetoConfig" | "applyConfig") {
    return () =>
      send(key, () =>
        writeContractAsync({ address: vault, abi: midnightVaultAbi, functionName })
      );
  }

  if (summary.hasPendingConfig && proposal?.[0]) {
    const [, guardians, threshold, heirs, shares, inactivityPeriod, requestTTL, applyAfter, vetoes] =
      proposal;
    const secondsLeft = Number(applyAfter) - now;

    return (
      <Card
        title="Pending configuration change"
        subtitle="Proposed by the owner. Guardians can veto it until the timelock expires."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={matured ? "ok" : "warn"}>
            {matured ? "Ready to apply" : `Applies in ${formatDuration(secondsLeft)}`}
          </Badge>
          <Badge tone={vetoes > 0 ? "danger" : "muted"}>
            {vetoes}/{summary.threshold.toString()} vetoes
          </Badge>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
              New guardians ({threshold.toString()} of {guardians.length} to approve)
            </p>
            <ul className="space-y-1.5">
              {guardians.map((guardian) => (
                <li key={guardian} className="text-sm text-ink-muted">
                  <Mono>{shortAddress(guardian)}</Mono>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
              New heirs
            </p>
            <ul className="space-y-1.5">
              {heirs.map((heir, index) => (
                <li key={heir} className="flex items-center gap-2 text-sm text-ink-muted">
                  <Mono>{shortAddress(heir)}</Mono>
                  <Badge tone="moon">{bpsToPercent(shares[index] ?? 0)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-faint">
          Inactivity {formatDuration(Number(inactivityPeriod))} · request TTL{" "}
          {formatDuration(Number(requestTTL))}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            className="h-9 px-3 text-xs"
            disabled={!matured}
            busy={pending === "apply-config"}
            onClick={simpleAction("apply-config", "applyConfig")}
          >
            {matured ? "Apply configuration" : "Waiting for timelock"}
          </Button>
          {role.isGuardian ? (
            <Button
              variant="danger"
              className="h-9 px-3 text-xs"
              busy={pending === "veto-config"}
              onClick={simpleAction("veto-config", "vetoConfig")}
            >
              Veto this change
            </Button>
          ) : null}
          {role.isOwner ? (
            <Button
              variant="ghost"
              className="h-9 px-3 text-xs"
              busy={pending === "cancel-config"}
              onClick={simpleAction("cancel-config", "cancelConfig")}
            >
              Cancel
            </Button>
          ) : null}
        </div>
        <ErrorText message={error} />
      </Card>
    );
  }

  if (!role.isOwner) return null;

  return (
    <Card
      title="Change guardians, heirs or timers"
      subtitle="Two-phase on purpose: the change waits 48h and your guardians can veto it, so a stolen key cannot swap them out from under you."
    >
      {showForm ? (
        <div className="space-y-6">
          <RoleForm value={form} onChange={setForm} />
          <div className="flex flex-wrap gap-2">
            <Button busy={pending === "propose-config"} onClick={propose}>
              Propose change
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          <ErrorText message={formError ?? error} />
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            setForm(summaryToForm(summary));
            setFormError(null);
            setShowForm(true);
          }}
        >
          Propose a configuration change
        </Button>
      )}
    </Card>
  );
}
