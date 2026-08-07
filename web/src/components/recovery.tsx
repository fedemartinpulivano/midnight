"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useReadContracts, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { shortAddress } from "@/lib/format";
import type { RecoveryData, VaultSummary } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { Badge, Button, Card, ErrorText, Field, inputClass, Mono } from "./ui";

const RECOVERY_DELAY_SECONDS = 2 * 86_400;
const PAGE_SIZE = 5;

export function RecoveryCard({
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
  const [newOwner, setNewOwner] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5_000);
    return () => clearInterval(timer);
  }, []);

  const ids = useMemo(() => {
    const last = Number(summary.recoveryCount);
    const first = Math.max(1, last - PAGE_SIZE + 1);
    const list: number[] = [];
    for (let id = last; id >= first; id--) list.push(id);
    return list;
  }, [summary.recoveryCount]);

  const { data } = useReadContracts({
    contracts: ids.map((id) => ({
      address: vault,
      abi: midnightVaultAbi,
      functionName: "getRecovery" as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: ids.length > 0 },
  });

  async function propose() {
    const target = newOwner.trim();
    if (!isAddress(target)) {
      setFormError("Enter a valid address for the new owner.");
      return;
    }
    setFormError(null);
    await send("propose-recovery", () =>
      writeContractAsync({
        address: vault,
        abi: midnightVaultAbi,
        functionName: "proposeRecovery",
        args: [target as `0x${string}`],
      })
    );
    setNewOwner("");
  }

  return (
    <Card
      title="Social recovery"
      subtitle="Guardians can rotate the owner key after a 48h timelock; the current owner can veto."
    >
      {role.isGuardian ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Rotate ownership to">
              <input
                className={inputClass}
                placeholder="New owner address (0x…)"
                value={newOwner}
                onChange={(event) => setNewOwner(event.target.value)}
              />
            </Field>
          </div>
          <Button
            variant="ghost"
            busy={pending === "propose-recovery"}
            onClick={propose}
          >
            Propose recovery
          </Button>
        </div>
      ) : null}

      {ids.length === 0 ? (
        <p className="text-sm text-ink-faint">No recovery proposals.</p>
      ) : (
        <ul className="space-y-3">
          {ids.map((id, index) => {
            const entry = data?.[index];
            if (!entry || entry.status !== "success") return null;
            const [proposal, stale] = entry.result as unknown as [RecoveryData, boolean];
            const closed = proposal.executed || proposal.cancelled || stale;
            const readyAt = Number(proposal.proposedAt) + RECOVERY_DELAY_SECONDS;
            const timelockPassed = now >= readyAt;
            const thresholdReached = proposal.approvals >= Number(summary.threshold);

            return (
              <li key={id} className="rounded-xl border border-line bg-well/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-faint">#{id}</span>
                    <span className="text-sm">
                      New owner: <Mono>{shortAddress(proposal.newOwner)}</Mono>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        proposal.executed
                          ? "ok"
                          : proposal.cancelled || stale
                            ? "danger"
                            : "warn"
                      }
                    >
                      {proposal.executed
                        ? "Executed"
                        : proposal.cancelled
                          ? "Vetoed"
                          : stale
                            ? "Stale"
                            : "Pending"}
                    </Badge>
                    <Badge tone="muted">
                      {proposal.approvals}/{summary.threshold.toString()} approvals
                    </Badge>
                  </div>
                </div>

                {!closed ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.isGuardian ? (
                      <Button
                        variant="ok"
                        className="h-9 px-3 text-xs"
                        busy={pending === `approve-recovery-${id}`}
                        onClick={() =>
                          send(`approve-recovery-${id}`, () =>
                            writeContractAsync({
                              address: vault,
                              abi: midnightVaultAbi,
                              functionName: "approveRecovery",
                              args: [BigInt(id)],
                            })
                          )
                        }
                      >
                        Approve
                      </Button>
                    ) : null}
                    {thresholdReached ? (
                      <Button
                        className="h-9 px-3 text-xs"
                        disabled={!timelockPassed}
                        busy={pending === `execute-recovery-${id}`}
                        onClick={() =>
                          send(`execute-recovery-${id}`, () =>
                            writeContractAsync({
                              address: vault,
                              abi: midnightVaultAbi,
                              functionName: "executeRecovery",
                              args: [BigInt(id)],
                            })
                          )
                        }
                      >
                        {timelockPassed ? "Execute rotation" : "Waiting for timelock"}
                      </Button>
                    ) : null}
                    {role.isOwner ? (
                      <Button
                        variant="danger"
                        className="h-9 px-3 text-xs"
                        busy={pending === `veto-recovery-${id}`}
                        onClick={() =>
                          send(`veto-recovery-${id}`, () =>
                            writeContractAsync({
                              address: vault,
                              abi: midnightVaultAbi,
                              functionName: "vetoRecovery",
                              args: [BigInt(id)],
                            })
                          )
                        }
                      >
                        Veto (I still have my key)
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <ErrorText message={formError ?? error} />
    </Card>
  );
}
