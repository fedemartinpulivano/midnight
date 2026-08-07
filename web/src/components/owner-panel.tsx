"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useSendTransaction, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { bpsToPercent, formatAmount, shortAddress } from "@/lib/format";
import type { VaultSummary } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { MoonWatch } from "./moon-phase";
import { Badge, Button, Card, ErrorText, Field, inputClass, Mono } from "./ui";

export function OwnerPanel({
  vault,
  summary,
}: {
  vault: `0x${string}`;
  summary: VaultSummary;
}) {
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { send, pending, error } = useTx();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawToken, setWithdrawToken] = useState<string>(ZERO_ADDRESS);
  const [formError, setFormError] = useState<string | null>(null);

  async function deposit() {
    let value: bigint;
    try {
      value = parseEther(depositAmount);
      if (value <= 0n) throw new Error();
    } catch {
      setFormError("Enter a valid deposit amount.");
      return;
    }
    setFormError(null);
    await send("deposit", () => sendTransactionAsync({ to: vault, value }));
    setDepositAmount("");
  }

  async function requestWithdrawal() {
    let amount: bigint;
    try {
      amount = parseEther(withdrawAmount);
      if (amount <= 0n) throw new Error();
    } catch {
      setFormError("Enter a valid withdrawal amount.");
      return;
    }
    if (!isAddress(withdrawTo.trim())) {
      setFormError("Enter a valid destination address.");
      return;
    }
    setFormError(null);
    await send("request", () =>
      writeContractAsync({
        address: vault,
        abi: midnightVaultAbi,
        functionName: "requestWithdrawal",
        args: [
          withdrawToken as `0x${string}`,
          withdrawTo.trim() as `0x${string}`,
          amount,
        ],
      })
    );
    setWithdrawAmount("");
    setWithdrawTo("");
  }

  return (
    <div className="space-y-4">
      {/* Night strip: the one dark surface of the dashboard, home of the vault's vitals. */}
      <section className="relative overflow-hidden rounded-2xl bg-sky p-6 shadow-lift">
        <div className="stars-far pointer-events-none absolute inset-0" aria-hidden />
        <div className="stars pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-starlight/80">
              Vault balance
            </p>
            <p className="mt-1 font-display text-5xl font-medium tracking-tight text-paper">
              {formatAmount(summary.nativeBalance)}
            </p>
            <p className="mt-1 text-xs text-starlight/60">
              {summary.trackedTokens.length} tracked token(s)
            </p>
          </div>
          <MoonWatch
            lastAlive={Number(summary.lastAlive)}
            period={Number(summary.inactivityPeriod)}
            bare
          />
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending === "heartbeat"}
            onClick={() =>
              send("heartbeat", () =>
                writeContractAsync({
                  address: vault,
                  abi: midnightVaultAbi,
                  functionName: "heartbeat",
                })
              )
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-moonface px-4 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
          >
            {pending === "heartbeat" ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              "♥"
            )}
            Heartbeat — reset to new moon
          </button>
          <span className="text-xs text-starlight/60">
            Free proof of life. Deposits and requests also reset it.
          </span>
          {summary.hasPendingConfig ? <Badge tone="warn">Config change pending</Badge> : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Deposit" subtitle="Deposits from your wallet also reset the inactivity clock.">
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Amount (tBNB)"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
            />
            <Button busy={pending === "deposit"} onClick={deposit}>
              Deposit
            </Button>
          </div>
        </Card>

        <Card
          title="Request withdrawal"
          subtitle={`Needs ${summary.threshold.toString()} of ${summary.guardians.length} guardian approvals.`}
        >
          <div className="space-y-2">
            {summary.trackedTokens.length > 0 ? (
              <Field label="Asset">
                <select
                  className={inputClass}
                  value={withdrawToken}
                  onChange={(event) => setWithdrawToken(event.target.value)}
                >
                  <option value={ZERO_ADDRESS}>Native (tBNB)</option>
                  {summary.trackedTokens.map((token) => (
                    <option key={token} value={token}>
                      {shortAddress(token)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <input
              className={inputClass}
              placeholder="Amount"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Destination address (0x…)"
              value={withdrawTo}
              onChange={(event) => setWithdrawTo(event.target.value)}
            />
            <Button busy={pending === "request"} onClick={requestWithdrawal} className="w-full">
              Create request
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Trust network">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
              Guardians ({summary.threshold.toString()} of {summary.guardians.length} to approve)
            </p>
            <ul className="space-y-1.5">
              {summary.guardians.map((guardian) => (
                <li key={guardian} className="text-sm text-ink-muted">
                  <Mono>{shortAddress(guardian)}</Mono>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
              Heirs
            </p>
            <ul className="space-y-1.5">
              {summary.heirs.map((heir, index) => (
                <li key={heir} className="flex items-center gap-2 text-sm text-ink-muted">
                  <Mono>{shortAddress(heir)}</Mono>
                  <Badge tone="moon">{bpsToPercent(summary.shares[index] ?? 0)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
      <ErrorText message={formError ?? error} />
    </div>
  );
}
