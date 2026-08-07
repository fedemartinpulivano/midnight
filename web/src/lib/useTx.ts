"use client";

import { useState } from "react";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { BaseError } from "viem";

/// Runs a write, waits for the receipt, then invalidates every on-chain read so
/// panels refresh immediately instead of waiting for the poll interval.
export function useTx() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(key: string, fn: () => Promise<`0x${string}`>) {
    setPending(key);
    setError(null);
    try {
      const hash = await fn();
      await waitForTransactionReceipt(config, { hash });
      await queryClient.invalidateQueries();
    } catch (err) {
      const message =
        err instanceof BaseError
          ? err.shortMessage
          : err instanceof Error
            ? err.message
            : "Transaction failed";
      setError(message);
    } finally {
      setPending(null);
    }
  }

  return { send, pending, error };
}
