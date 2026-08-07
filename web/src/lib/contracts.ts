import { bscTestnet, hardhat } from "viem/chains";
import type { Chain } from "viem";

const rawFactory = process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "";

export const FACTORY_ADDRESS = (
  /^0x[0-9a-fA-F]{40}$/.test(rawFactory)
    ? rawFactory
    : "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const FACTORY_CONFIGURED =
  FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");

export const CHAIN: Chain = chainId === 31337 ? hardhat : bscTestnet;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL && process.env.NEXT_PUBLIC_RPC_URL.length > 0
    ? process.env.NEXT_PUBLIC_RPC_URL
    : undefined;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const REQUEST_STATUS = ["None", "Pending", "Executed", "Cancelled", "Rejected"] as const;
