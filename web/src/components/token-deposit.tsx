"use client";

import { useState } from "react";
import { erc20Abi, isAddress, parseUnits } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { midnightVaultAbi } from "@/lib/abi";
import { useTx } from "@/lib/useTx";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";

/// ERC20 deposits need the token's own decimals and an allowance first — the two
/// reasons this cannot be folded into the plain native deposit box.
export function TokenDeposit({ vault }: { vault: `0x${string}` }) {
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const { send, pending, error } = useTx();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);

  async function deposit() {
    const tokenAddress = token.trim();
    if (!isAddress(tokenAddress)) {
      setFormError("Enter a valid token address.");
      return;
    }
    if (!address) {
      setFormError("Connect a wallet first.");
      return;
    }
    setFormError(null);

    await send("deposit-token", async () => {
      const erc20 = { address: tokenAddress as `0x${string}`, abi: erc20Abi } as const;

      setStep("Reading token…");
      const decimals = await readContract(config, { ...erc20, functionName: "decimals" });

      let value: bigint;
      try {
        value = parseUnits(amount, decimals);
        if (value <= 0n) throw new Error();
      } catch {
        setStep(null);
        throw new Error("Enter a valid deposit amount.");
      }

      const allowance = await readContract(config, {
        ...erc20,
        functionName: "allowance",
        args: [address, vault],
      });

      if (allowance < value) {
        setStep("Approving…");
        const approvalHash = await writeContractAsync({
          ...erc20,
          functionName: "approve",
          args: [vault, value],
        });
        await waitForTransactionReceipt(config, { hash: approvalHash });
      }

      setStep("Depositing…");
      const hash = await writeContractAsync({
        address: vault,
        abi: midnightVaultAbi,
        functionName: "depositToken",
        args: [tokenAddress as `0x${string}`, value],
      });
      setStep(null);
      return hash;
    });

    setStep(null);
    setToken("");
    setAmount("");
  }

  return (
    <Card
      title="Deposit a token"
      subtitle="Approves the vault if needed, then pulls the tokens in and tracks them so heirs can claim them."
    >
      <div className="space-y-2">
        <Field label="Token address">
          <input
            className={inputClass}
            placeholder="0x…"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>
        <input
          className={inputClass}
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Button
          busy={pending === "deposit-token"}
          onClick={deposit}
          className="w-full"
        >
          {pending === "deposit-token" && step ? step : "Deposit token"}
        </Button>
      </div>
      <ErrorText message={formError ?? error} />
    </Card>
  );
}
