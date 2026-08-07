"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { midnightFactoryAbi } from "@/lib/abi";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { useTx } from "@/lib/useTx";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";

type HeirRow = { address: string; percent: string };

export function CreateVault({ onCreated }: { onCreated?: () => void }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { send, pending, error } = useTx();

  const [guardians, setGuardians] = useState<string[]>(["", ""]);
  const [threshold, setThreshold] = useState("2");
  const [heirs, setHeirs] = useState<HeirRow[]>([
    { address: "", percent: "60" },
    { address: "", percent: "40" },
  ]);
  const [inactivityDays, setInactivityDays] = useState("30");
  const [ttlDays, setTtlDays] = useState("3");
  const [formError, setFormError] = useState<string | null>(null);

  const percentTotal = heirs.reduce((sum, heir) => sum + (Number(heir.percent) || 0), 0);

  function validate(): string | null {
    if (!address) return "Connect a wallet first.";
    const cleanGuardians = guardians.map((g) => g.trim());
    if (cleanGuardians.some((g) => !isAddress(g))) return "Every guardian needs a valid address.";
    if (new Set(cleanGuardians.map((g) => g.toLowerCase())).size !== cleanGuardians.length)
      return "Guardian addresses must be unique.";
    if (cleanGuardians.some((g) => g.toLowerCase() === address.toLowerCase()))
      return "You cannot be your own guardian.";
    const thresholdNumber = Number(threshold);
    if (!Number.isInteger(thresholdNumber) || thresholdNumber < 1 || thresholdNumber > cleanGuardians.length)
      return `Threshold must be between 1 and ${cleanGuardians.length}.`;
    if (heirs.some((heir) => !isAddress(heir.address.trim()))) return "Every heir needs a valid address.";
    if (new Set(heirs.map((heir) => heir.address.trim().toLowerCase())).size !== heirs.length)
      return "Heir addresses must be unique.";
    if (heirs.some((heir) => heir.address.trim().toLowerCase() === address.toLowerCase()))
      return "You cannot be your own heir.";
    if (Math.round(percentTotal * 100) !== 10_000) return "Heir shares must add up to exactly 100%.";
    if (Number(inactivityDays) < 1) return "Inactivity period must be at least 1 day.";
    const ttl = Number(ttlDays);
    if (ttl < 1 / 24 || ttl > 30) return "Request TTL must be between 1 hour and 30 days.";
    return null;
  }

  async function submit() {
    const problem = validate();
    setFormError(problem);
    if (problem || !address) return;

    await send("create", () =>
      writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: midnightFactoryAbi,
        functionName: "createVault",
        args: [
          {
            owner: address,
            guardians: guardians.map((g) => g.trim() as `0x${string}`),
            threshold: BigInt(threshold),
            heirs: heirs.map((heir) => heir.address.trim() as `0x${string}`),
            shares: heirs.map((heir) => Math.round(Number(heir.percent) * 100)),
            inactivityPeriod: BigInt(Math.round(Number(inactivityDays) * 86_400)),
            requestTTL: BigInt(Math.round(Number(ttlDays) * 86_400)),
          },
        ],
      })
    );
    onCreated?.();
  }

  return (
    <Card
      title="Create your vault"
      subtitle="Deployed as a minimal proxy clone — one cheap transaction, no backend, no custody."
    >
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Guardians</p>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              onClick={() => setGuardians((rows) => (rows.length < 10 ? [...rows, ""] : rows))}
            >
              + Add guardian
            </Button>
          </div>
          <div className="space-y-2">
            {guardians.map((guardian, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder={`Guardian ${index + 1} address (0x…)`}
                  value={guardian}
                  onChange={(event) =>
                    setGuardians((rows) =>
                      rows.map((row, i) => (i === index ? event.target.value : row))
                    )
                  }
                />
                {guardians.length > 1 ? (
                  <Button
                    variant="ghost"
                    className="h-10 px-3"
                    onClick={() =>
                      setGuardians((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    ×
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 max-w-xs">
            <Field
              label="Approval threshold"
              hint={`${threshold} of ${guardians.length} guardians must approve each withdrawal`}
            >
              <input
                className={inputClass}
                type="number"
                min={1}
                max={guardians.length}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Heirs{" "}
              <span className={percentTotal === 100 ? "text-ok" : "text-warn"}>
                ({percentTotal}%)
              </span>
            </p>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              onClick={() =>
                setHeirs((rows) =>
                  rows.length < 10 ? [...rows, { address: "", percent: "0" }] : rows
                )
              }
            >
              + Add heir
            </Button>
          </div>
          <div className="space-y-2">
            {heirs.map((heir, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder={`Heir ${index + 1} address (0x…)`}
                  value={heir.address}
                  onChange={(event) =>
                    setHeirs((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, address: event.target.value } : row
                      )
                    )
                  }
                />
                <input
                  className={`${inputClass} w-24 shrink-0`}
                  type="number"
                  min={0}
                  max={100}
                  value={heir.percent}
                  onChange={(event) =>
                    setHeirs((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, percent: event.target.value } : row
                      )
                    )
                  }
                />
                {heirs.length > 1 ? (
                  <Button
                    variant="ghost"
                    className="h-10 px-3"
                    onClick={() => setHeirs((rows) => rows.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Inactivity period (days)" hint="After this long without proof of life, heirs can claim">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={inactivityDays}
              onChange={(event) => setInactivityDays(event.target.value)}
            />
          </Field>
          <Field label="Withdrawal request TTL (days)" hint="Unapproved requests expire after this">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={30}
              value={ttlDays}
              onChange={(event) => setTtlDays(event.target.value)}
            />
          </Field>
        </div>

        <Button busy={pending === "create"} onClick={submit} className="w-full sm:w-auto">
          Deploy vault
        </Button>
        <ErrorText message={formError ?? error} />
      </div>
    </Card>
  );
}
