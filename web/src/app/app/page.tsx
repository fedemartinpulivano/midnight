"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useSwitchChain } from "wagmi";
import { midnightFactoryAbi, midnightVaultAbi } from "@/lib/abi";
import { ConfigPanel } from "@/components/config-panel";
import { ConnectControl } from "@/components/connect";
import { CreateVault } from "@/components/create-vault";
import { GuardianPanel } from "@/components/guardian-panel";
import { HeirPanel } from "@/components/heir-panel";
import { OwnerPanel } from "@/components/owner-panel";
import { RecoveryCard } from "@/components/recovery";
import { RequestsCard } from "@/components/requests";
import { Badge, Button, Card, inputClass, Mono } from "@/components/ui";
import { CHAIN, FACTORY_ADDRESS, FACTORY_CONFIGURED } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { sameAddress, type VaultSummary } from "@/lib/types";

export default function Dashboard() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [selectedVault, setSelectedVault] = useState<`0x${string}` | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [lookup, setLookup] = useState("");
  const [manualVaults, setManualVaults] = useState<`0x${string}`[]>([]);

  const { data: vaultLists } = useReadContracts({
    contracts: (["vaultsOfOwner", "vaultsOfGuardian", "vaultsOfHeir"] as const).map(
      (functionName) => ({
        address: FACTORY_ADDRESS,
        abi: midnightFactoryAbi,
        functionName,
        args: [address!] as const,
      })
    ),
    query: { enabled: !!address && FACTORY_CONFIGURED },
  });

  const vaults = useMemo(() => {
    const seen = new Set<string>();
    const merged: `0x${string}`[] = [];
    const push = (vault: `0x${string}`) => {
      if (seen.has(vault.toLowerCase())) return;
      seen.add(vault.toLowerCase());
      merged.push(vault);
    };
    for (const entry of vaultLists ?? []) {
      if (entry.status !== "success") continue;
      for (const vault of entry.result as readonly `0x${string}`[]) push(vault);
    }
    // Vaults opened by hand still belong in the list — the registry index is a
    // convenience, not the source of truth.
    for (const vault of manualVaults) push(vault);
    return merged;
  }, [vaultLists, manualVaults]);

  const activeVault = selectedVault ?? vaults[0] ?? null;

  const { data: summaryData } = useReadContract({
    address: activeVault ?? undefined,
    abi: midnightVaultAbi,
    functionName: "summary",
    query: { enabled: !!activeVault },
  });
  const summary = summaryData as unknown as VaultSummary | undefined;

  const role = useMemo(() => {
    if (!summary || !address)
      return { isOwner: false, isGuardian: false, isHeir: false };
    return {
      isOwner: sameAddress(summary.owner, address),
      isGuardian: summary.guardians.some((guardian) => sameAddress(guardian, address)),
      isHeir: summary.heirs.some((heir) => sameAddress(heir, address)),
    };
  }, [summary, address]);

  const wrongNetwork = isConnected && chainId !== CHAIN.id;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-20">
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          <span className="mr-1.5 inline-block size-2.5 rounded-full bg-gold align-middle" />
          midnight
        </Link>
        <ConnectControl />
      </nav>

      {!FACTORY_CONFIGURED ? (
        <Card title="Factory not configured">
          <p className="text-sm text-ink-muted">
            Set <Mono>NEXT_PUBLIC_FACTORY_ADDRESS</Mono> in <Mono>web/.env.local</Mono>.
            Deploy one with <Mono>cd contracts && npm run deploy:bscTestnet</Mono>.
          </p>
        </Card>
      ) : !isConnected ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <h1 className="text-2xl font-semibold">Connect to enter the vault</h1>
            <p className="max-w-md text-sm text-ink-muted">
              Midnight reads everything directly from {CHAIN.name}. No accounts, no
              backend — your wallet is your identity.
            </p>
            <ConnectControl />
          </div>
        </Card>
      ) : wrongNetwork ? (
        <Card title="Wrong network">
          <p className="text-sm text-ink-muted">
            Your wallet is on chain id {chainId}. Midnight runs on{" "}
            <span className="text-ink">{CHAIN.name}</span> (chain id {CHAIN.id}).
          </p>
          <div className="mt-4">
            <Button
              busy={isSwitching}
              onClick={() => switchChain({ chainId: CHAIN.id })}
            >
              Switch to {CHAIN.name}
            </Button>
            <p className="mt-2 text-xs text-ink-faint">
              If the network is missing, your wallet will prompt to add it first.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {vaults.map((vault) => (
              <button
                key={vault}
                onClick={() => setSelectedVault(vault)}
                className={`rounded-xl border px-3 py-2 font-mono text-xs transition-colors ${
                  vault === activeVault
                    ? "border-moon bg-moon-soft text-moon"
                    : "border-line bg-card text-ink-muted hover:border-moon"
                }`}
              >
                {shortAddress(vault)}
              </button>
            ))}
            <button
              onClick={() => setShowCreate((value) => !value)}
              className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:border-moon hover:text-moon"
            >
              + New vault
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputClass} h-9 max-w-xs text-xs`}
              placeholder="Open a vault by address (0x…)"
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
            />
            <Button
              variant="ghost"
              className="h-9 px-3 text-xs"
              disabled={!isAddress(lookup.trim())}
              onClick={() => {
                const vault = lookup.trim() as `0x${string}`;
                setManualVaults((current) =>
                  current.some((entry) => sameAddress(entry, vault))
                    ? current
                    : [...current, vault]
                );
                setSelectedVault(vault);
                setLookup("");
              }}
            >
              Open
            </Button>
          </div>

          {showCreate || vaults.length === 0 ? (
            <CreateVault onCreated={() => setShowCreate(false)} />
          ) : null}

          {activeVault && summary ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted">
                  Vault <Mono>{shortAddress(activeVault)}</Mono>
                </span>
                {role.isOwner ? <Badge tone="moon">Owner</Badge> : null}
                {role.isGuardian ? <Badge tone="ok">Guardian</Badge> : null}
                {role.isHeir ? <Badge tone="warn">Heir</Badge> : null}
              </div>

              {role.isOwner ? <OwnerPanel vault={activeVault} summary={summary} /> : null}
              {role.isGuardian ? (
                <GuardianPanel vault={activeVault} summary={summary} />
              ) : null}
              {role.isHeir ? <HeirPanel vault={activeVault} summary={summary} /> : null}

              <RequestsCard
                vault={activeVault}
                summary={summary}
                role={{ isOwner: role.isOwner, isGuardian: role.isGuardian }}
              />
              <RecoveryCard
                vault={activeVault}
                summary={summary}
                role={{ isOwner: role.isOwner, isGuardian: role.isGuardian }}
              />
              <ConfigPanel
                vault={activeVault}
                summary={summary}
                role={{ isOwner: role.isOwner, isGuardian: role.isGuardian }}
              />
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}
