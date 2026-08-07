"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useSendTransaction, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { bpsToPercent, formatAmount, shortAddress } from "@/lib/format";
import type { VaultSummary } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { Countdown } from "./countdown";
import { Badge, Button, Card, ErrorText, Field, inputClass, Mono, Stat } from "./ui";

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
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Stat
            label="Vault balance"
            value={formatAmount(summary.nativeBalance)}
            sub={`${summary.trackedTokens.length} tracked token(s)`}
          />
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
              Inheritance unlocks in
            </p>
            <Countdown target={Number(summary.inheritanceUnlocksAt)} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            busy={pending === "heartbeat"}
            onClick={() =>
              send("heartbeat", () =>
                writeContractAsync({
                  address: vault,
                  abi: midnightVaultAbi,
                  functionName: "heartbeat",
                })
              )
            }
          >
            ♥ Heartbeat (free proof of life)
          </Button>
          {summary.hasPendingConfig ? <Badge tone="warn">Config change pending</Badge> : null}
        </div>
      </Card>

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
