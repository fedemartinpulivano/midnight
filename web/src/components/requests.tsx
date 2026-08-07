"use client";

import { useMemo } from "react";
import { useReadContracts, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { REQUEST_STATUS, ZERO_ADDRESS } from "@/lib/contracts";
import { formatTokenAmount, shortAddress } from "@/lib/format";
import { metaFor, useTokenMeta } from "@/lib/tokens";
import type { VaultSummary, WithdrawalRequestData } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { Badge, Button, Card, ErrorText, Mono } from "./ui";

const PAGE_SIZE = 10;

export function RequestsCard({
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
  const tokenMeta = useTokenMeta(summary.trackedTokens);

  const ids = useMemo(() => {
    const last = Number(summary.requestCount);
    const first = Math.max(1, last - PAGE_SIZE + 1);
    const list: number[] = [];
    for (let id = last; id >= first; id--) list.push(id);
    return list;
  }, [summary.requestCount]);

  const { data } = useReadContracts({
    contracts: ids.map((id) => ({
      address: vault,
      abi: midnightVaultAbi,
      functionName: "getRequest" as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: ids.length > 0 },
  });

  if (ids.length === 0) {
    return (
      <Card title="Withdrawal requests">
        <p className="text-sm text-ink-faint">No withdrawal requests yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Withdrawal requests" subtitle={`Showing the last ${ids.length}`}>
      <ul className="space-y-3">
        {ids.map((id, index) => {
          const entry = data?.[index];
          if (!entry || entry.status !== "success") return null;
          const [request, stale, expired] = entry.result as unknown as [
            WithdrawalRequestData,
            boolean,
            boolean,
          ];
          const isPendingStatus = request.status === 1 && !stale && !expired;
          const statusLabel = stale
            ? "Stale"
            : expired
              ? "Expired"
              : REQUEST_STATUS[request.status] ?? "?";
          const tone =
            statusLabel === "Executed"
              ? "ok"
              : statusLabel === "Pending"
                ? "warn"
                : statusLabel === "Rejected" || statusLabel === "Cancelled"
                  ? "danger"
                  : "muted";

          return (
            <li key={id} className="rounded-xl border border-line bg-well/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-faint">#{id}</span>
                  <span className="font-semibold">
                    {(() => {
                      const meta = metaFor(tokenMeta, request.token, ZERO_ADDRESS);
                      return formatTokenAmount(request.amount, meta.decimals, meta.symbol);
                    })()}
                  </span>
                  <span className="text-sm text-ink-muted">
                    → <Mono>{shortAddress(request.to)}</Mono>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tone}>{statusLabel}</Badge>
                  <Badge tone="muted">
                    {request.approvals}/{summary.threshold.toString()} approvals
                  </Badge>
                </div>
              </div>

              {isPendingStatus && (role.isGuardian || role.isOwner) ? (
                <div className="mt-3 flex gap-2">
                  {role.isGuardian ? (
                    <>
                      <Button
                        variant="ok"
                        className="h-9 px-3 text-xs"
                        busy={pending === `approve-${id}`}
                        onClick={() =>
                          send(`approve-${id}`, () =>
                            writeContractAsync({
                              address: vault,
                              abi: midnightVaultAbi,
                              functionName: "approveWithdrawal",
                              args: [BigInt(id)],
                            })
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        className="h-9 px-3 text-xs"
                        busy={pending === `reject-${id}`}
                        onClick={() =>
                          send(`reject-${id}`, () =>
                            writeContractAsync({
                              address: vault,
                              abi: midnightVaultAbi,
                              functionName: "rejectWithdrawal",
                              args: [BigInt(id)],
                            })
                          )
                        }
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {role.isOwner ? (
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-xs"
                      busy={pending === `cancel-${id}`}
                      onClick={() =>
                        send(`cancel-${id}`, () =>
                          writeContractAsync({
                            address: vault,
                            abi: midnightVaultAbi,
                            functionName: "cancelWithdrawal",
                            args: [BigInt(id)],
                          })
                        )
                      }
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ErrorText message={error} />
    </Card>
  );
}
