"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { midnightFactoryAbi, midnightVaultAbi } from "@/lib/abi";
import { ConnectControl } from "@/components/connect";
import { CreateVault } from "@/components/create-vault";
import { GuardianPanel } from "@/components/guardian-panel";
import { HeirPanel } from "@/components/heir-panel";
import { OwnerPanel } from "@/components/owner-panel";
import { RecoveryCard } from "@/components/recovery";
import { RequestsCard } from "@/components/requests";
import { Badge, Card, Mono } from "@/components/ui";
import { CHAIN, FACTORY_ADDRESS, FACTORY_CONFIGURED } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { sameAddress, type VaultSummary } from "@/lib/types";

export default function Dashboard() {
  const { address, isConnected, chainId } = useAccount();
  const [selectedVault, setSelectedVault] = useState<`0x${string}` | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    for (const entry of vaultLists ?? []) {
      if (entry.status !== "success") continue;
      for (const vault of entry.result as readonly `0x${string}`[]) {
        if (!seen.has(vault.toLowerCase())) {
          seen.add(vault.toLowerCase());
          merged.push(vault);
        }
      }
    }
    return merged;
  }, [vaultLists]);

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
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-moon">●</span> midnight
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
            Switch your wallet to <span className="text-ink">{CHAIN.name}</span> (chain id{" "}
            {CHAIN.id}) and reload.
          </p>
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
                    : "border-line bg-night-900 text-ink-muted hover:border-moon"
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
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}
