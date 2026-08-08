"use client";

import { useState } from "react";
import { isAddress, parseEther, parseUnits } from "viem";
import { useSendTransaction, useWriteContract } from "wagmi";
import { midnightVaultAbi } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { bpsToPercent, formatAmount, shortAddress } from "@/lib/format";
import { metaFor, useTokenMeta } from "@/lib/tokens";
import type { VaultSummary } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { SilenceWatch } from "./dial";
import { TokenDeposit } from "./token-deposit";
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

  const tokenMeta = useTokenMeta(summary.trackedTokens);
  const selectedMeta = metaFor(tokenMeta, withdrawToken as `0x${string}`, ZERO_ADDRESS);

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
      // Parsed with the selected asset's own decimals, not a hardcoded 18.
      amount = parseUnits(withdrawAmount, selectedMeta.decimals);
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
      {/* The vault's vitals: what is in it, and how long the silence has run. */}
      <section
        className="relative border border-line p-9"
        style={{ background: "linear-gradient(180deg,#181a22,#101217)" }}
      >
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-ink-faint">
              Vault balance
            </p>
            <p
              className="mt-3 font-display text-6xl font-extrabold tracking-[-0.04em] text-ink"
              style={{ fontVariationSettings: '"wdth" 88' }}
            >
              {formatAmount(summary.nativeBalance)}
            </p>
            <p className="mt-2 font-mono text-xs text-ink-faint">
              {summary.trackedTokens.length} tracked token(s) · vault{" "}
              {shortAddress(vault)}
            </p>
          </div>
          <SilenceWatch
            lastAlive={Number(summary.lastAlive)}
            period={Number(summary.inactivityPeriod)}
            unlockedOnChain={summary.inheritanceUnlocked}
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
            className="inline-flex h-11 items-center gap-2 border border-moon px-5 text-sm font-semibold text-moon transition-colors hover:bg-moon/12 active:bg-moon/22 disabled:opacity-60"
          >
            {pending === "heartbeat" ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            Heartbeat — reset the clock
          </button>
          <span className="max-w-[32ch] text-xs text-ink-faint">
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
                      {metaFor(tokenMeta, token, ZERO_ADDRESS).symbol} · {shortAddress(token)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <input
              className={inputClass}
              placeholder={`Amount (${selectedMeta.symbol})`}
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

        <TokenDeposit vault={vault} />

        {summary.trackedTokens.length > 0 ? (
          <Card
            title="Tracked tokens"
            subtitle="Included in every inheritance claim. Empty ones can be dropped to free a slot."
          >
            <ul className="space-y-2">
              {summary.trackedTokens.map((token) => (
                <li key={token} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink-muted">
                    <Badge tone="muted">{metaFor(tokenMeta, token, ZERO_ADDRESS).symbol}</Badge>{" "}
                    <Mono>{shortAddress(token)}</Mono>
                  </span>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs"
                    busy={pending === `untrack-${token}`}
                    onClick={() =>
                      send(`untrack-${token}`, () =>
                        writeContractAsync({
                          address: vault,
                          abi: midnightVaultAbi,
                          functionName: "untrackToken",
                          args: [token],
                        })
                      )
                    }
                  >
                    Untrack
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <Card title="Trust network">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.26em] text-ink-faint">
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
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.26em] text-ink-faint">
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
