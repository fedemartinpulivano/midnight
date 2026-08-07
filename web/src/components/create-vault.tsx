"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { midnightFactoryAbi } from "@/lib/abi";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { useTx } from "@/lib/useTx";
import {
  DEFAULT_ROLE_FORM,
  RoleForm,
  toContractRoles,
  validateRoles,
  type RoleFormValue,
} from "./role-form";
import { Button, Card, ErrorText } from "./ui";

export function CreateVault({ onCreated }: { onCreated?: () => void }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { send, pending, error } = useTx();

  const [form, setForm] = useState<RoleFormValue>(DEFAULT_ROLE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    if (!address) {
      setFormError("Connect a wallet first.");
      return;
    }
    const problem = validateRoles(form, address);
    setFormError(problem);
    if (problem) return;

    await send("create", () =>
      writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: midnightFactoryAbi,
        functionName: "createVault",
        args: [{ owner: address, ...toContractRoles(form) }],
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
        <RoleForm value={form} onChange={setForm} />
        <Button busy={pending === "create"} onClick={submit} className="w-full sm:w-auto">
          Deploy vault
        </Button>
        <ErrorText message={formError ?? error} />
      </div>
    </Card>
  );
}
