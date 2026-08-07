"use client";

import { useMemo } from "react";
import { erc20Abi } from "viem";
import { useReadContracts } from "wagmi";
import { shortAddress } from "./format";

export type TokenMeta = { symbol: string; decimals: number };

/// Native coin and anything we could not read fall back to 18 decimals, which is
/// what every amount in this app assumed before tokens were reachable from the UI.
export const NATIVE_META: TokenMeta = { symbol: "tBNB", decimals: 18 };

/// Reads symbol + decimals for the vault's tracked tokens in one multicall.
/// Amounts must never be parsed with a hardcoded 18 — USDT-style tokens use 6,
/// and getting that wrong moves a million times too much or too little.
export function useTokenMeta(tokens: readonly `0x${string}`[]) {
  const { data } = useReadContracts({
    contracts: tokens.flatMap((address) => [
      { address, abi: erc20Abi, functionName: "symbol" as const },
      { address, abi: erc20Abi, functionName: "decimals" as const },
    ]),
    query: { enabled: tokens.length > 0 },
  });

  return useMemo(() => {
    const map = new Map<string, TokenMeta>();
    tokens.forEach((address, index) => {
      const symbolEntry = data?.[index * 2];
      const decimalsEntry = data?.[index * 2 + 1];
      map.set(address.toLowerCase(), {
        symbol:
          symbolEntry?.status === "success"
            ? (symbolEntry.result as string)
            : shortAddress(address),
        decimals:
          decimalsEntry?.status === "success" ? Number(decimalsEntry.result) : 18,
      });
    });
    return map;
  }, [data, tokens]);
}

export function metaFor(
  map: Map<string, TokenMeta>,
  token: `0x${string}`,
  zeroAddress: string
): TokenMeta {
  if (token.toLowerCase() === zeroAddress.toLowerCase()) return NATIVE_META;
  return map.get(token.toLowerCase()) ?? { symbol: shortAddress(token), decimals: 18 };
}
