"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button, Mono } from "./ui";
import { shortAddress } from "@/lib/format";

export function ConnectControl() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-xl border border-line bg-night-800 px-3 py-2">
          <Mono>{shortAddress(address)}</Mono>
        </span>
        <Button variant="ghost" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      busy={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      disabled={connectors.length === 0}
    >
      Connect wallet
    </Button>
  );
}
