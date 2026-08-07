"use client";

import { isAddress } from "viem";
import { Button, Field, inputClass } from "./ui";

export type HeirRow = { address: string; percent: string };

export type RoleFormValue = {
  guardians: string[];
  threshold: string;
  heirs: HeirRow[];
  inactivityDays: string;
  ttlDays: string;
};

export const DEFAULT_ROLE_FORM: RoleFormValue = {
  guardians: ["", ""],
  threshold: "2",
  heirs: [
    { address: "", percent: "60" },
    { address: "", percent: "40" },
  ],
  inactivityDays: "30",
  ttlDays: "3",
};

export function percentTotalOf(value: RoleFormValue): number {
  return value.heirs.reduce((sum, heir) => sum + (Number(heir.percent) || 0), 0);
}

/// Mirrors the contract's own validation so the user sees the problem before
/// paying for a reverted transaction.
export function validateRoles(value: RoleFormValue, owner?: string): string | null {
  const guardians = value.guardians.map((guardian) => guardian.trim());
  if (guardians.length === 0) return "Add at least one guardian.";
  if (guardians.some((guardian) => !isAddress(guardian)))
    return "Every guardian needs a valid address.";
  if (new Set(guardians.map((guardian) => guardian.toLowerCase())).size !== guardians.length)
    return "Guardian addresses must be unique.";
  if (owner && guardians.some((guardian) => guardian.toLowerCase() === owner.toLowerCase()))
    return "The owner cannot be their own guardian.";

  const threshold = Number(value.threshold);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > guardians.length)
    return `Threshold must be between 1 and ${guardians.length}.`;

  const heirs = value.heirs.map((heir) => heir.address.trim());
  if (heirs.length === 0) return "Add at least one heir.";
  if (heirs.some((heir) => !isAddress(heir))) return "Every heir needs a valid address.";
  if (new Set(heirs.map((heir) => heir.toLowerCase())).size !== heirs.length)
    return "Heir addresses must be unique.";
  if (owner && heirs.some((heir) => heir.toLowerCase() === owner.toLowerCase()))
    return "The owner cannot be their own heir.";
  if (value.heirs.some((heir) => Number(heir.percent) <= 0))
    return "Every heir needs a share above 0%.";
  if (Math.round(percentTotalOf(value) * 100) !== 10_000)
    return "Heir shares must add up to exactly 100%.";

  if (Number(value.inactivityDays) < 1) return "Inactivity period must be at least 1 day.";
  const ttl = Number(value.ttlDays);
  if (ttl < 1 / 24 || ttl > 30) return "Request TTL must be between 1 hour and 30 days.";

  return null;
}

export function toContractRoles(value: RoleFormValue) {
  return {
    guardians: value.guardians.map((guardian) => guardian.trim() as `0x${string}`),
    threshold: BigInt(value.threshold),
    heirs: value.heirs.map((heir) => heir.address.trim() as `0x${string}`),
    shares: value.heirs.map((heir) => Math.round(Number(heir.percent) * 100)),
    inactivityPeriod: BigInt(Math.round(Number(value.inactivityDays) * 86_400)),
    requestTTL: BigInt(Math.round(Number(value.ttlDays) * 86_400)),
  };
}

export function RoleForm({
  value,
  onChange,
}: {
  value: RoleFormValue;
  onChange: (next: RoleFormValue) => void;
}) {
  const percentTotal = percentTotalOf(value);
  const patch = (partial: Partial<RoleFormValue>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Guardians</p>
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            onClick={() =>
              value.guardians.length < 10 && patch({ guardians: [...value.guardians, ""] })
            }
          >
            + Add guardian
          </Button>
        </div>
        <div className="space-y-2">
          {value.guardians.map((guardian, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={`${inputClass} min-w-0`}
                placeholder={`Guardian ${index + 1} address (0x…)`}
                value={guardian}
                onChange={(event) =>
                  patch({
                    guardians: value.guardians.map((row, i) =>
                      i === index ? event.target.value : row
                    ),
                  })
                }
              />
              {value.guardians.length > 1 ? (
                <Button
                  variant="ghost"
                  className="h-10 px-3"
                  onClick={() =>
                    patch({ guardians: value.guardians.filter((_, i) => i !== index) })
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
            hint={`${value.threshold} of ${value.guardians.length} guardians must approve each withdrawal`}
          >
            <input
              className={inputClass}
              type="number"
              min={1}
              max={value.guardians.length}
              value={value.threshold}
              onChange={(event) => patch({ threshold: event.target.value })}
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
              value.heirs.length < 10 &&
              patch({ heirs: [...value.heirs, { address: "", percent: "0" }] })
            }
          >
            + Add heir
          </Button>
        </div>
        <div className="space-y-2">
          {value.heirs.map((heir, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={`${inputClass} min-w-0`}
                placeholder={`Heir ${index + 1} address (0x…)`}
                value={heir.address}
                onChange={(event) =>
                  patch({
                    heirs: value.heirs.map((row, i) =>
                      i === index ? { ...row, address: event.target.value } : row
                    ),
                  })
                }
              />
              <input
                className={`${inputClass} basis-24 grow-0 shrink-0 text-center`}
                type="number"
                min={0}
                max={100}
                value={heir.percent}
                onChange={(event) =>
                  patch({
                    heirs: value.heirs.map((row, i) =>
                      i === index ? { ...row, percent: event.target.value } : row
                    ),
                  })
                }
              />
              {value.heirs.length > 1 ? (
                <Button
                  variant="ghost"
                  className="h-10 px-3"
                  onClick={() => patch({ heirs: value.heirs.filter((_, i) => i !== index) })}
                >
                  ×
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Inactivity period (days)"
          hint="After this long without proof of life, heirs can start a claim"
        >
          <input
            className={inputClass}
            type="number"
            min={1}
            value={value.inactivityDays}
            onChange={(event) => patch({ inactivityDays: event.target.value })}
          />
        </Field>
        <Field label="Withdrawal request TTL (days)" hint="Unapproved requests expire after this">
          <input
            className={inputClass}
            type="number"
            min={1}
            max={30}
            value={value.ttlDays}
            onChange={(event) => patch({ ttlDays: event.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
