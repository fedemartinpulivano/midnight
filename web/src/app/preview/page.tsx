"use client";

// Design preview with mocked on-chain data — lets us iterate on the dashboard
// visuals without a connected wallet or a running chain. Not linked from the UI.
import { GuardianPanel } from "@/components/guardian-panel";
import { HeirPanel } from "@/components/heir-panel";
import { OwnerPanel } from "@/components/owner-panel";
import { Mono } from "@/components/ui";
import { Mark } from "@/components/strongroom/mark";
import type { VaultSummary } from "@/lib/types";

const DAY = 86_400;
// Rounded to the hour so the server-rendered mock matches the client on
// hydration instead of drifting by the seconds between the two renders.
const now = Math.floor(Date.now() / 3_600_000) * 3600;

const mockVault = "0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968" as `0x${string}`;

const mockSummary: VaultSummary = {
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  guardians: [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  ],
  threshold: 2n,
  heirs: [
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  ],
  shares: [6000, 4000],
  inactivityPeriod: BigInt(30 * DAY),
  requestTTL: BigInt(3 * DAY),
  lastAlive: BigInt(now - 11 * DAY),
  nativeBalance: 5_000_000_000_000_000_000n,
  trackedTokens: [],
  requestCount: 0n,
  minValidRequestId: 1n,
  recoveryCount: 0n,
  minValidRecoveryId: 1n,
  inheritanceUnlocked: false,
  inheritanceUnlocksAt: BigInt(now + 19 * DAY),
  inheritanceAnnouncedAt: 0n,
  inheritanceClaimableAt: 0n,
  inheritanceClaimable: false,
  hasPendingConfig: false,
};

export default function DesignPreview() {
  return (
    <main className="mx-auto min-h-screen max-w-[1320px] space-y-10 px-6 py-12 sm:px-12">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-6">
        <Mark size={24} />
        <span className="vault-expanded text-[12.5px] font-bold uppercase tracking-[0.34em] text-ink">
          Strongroom
        </span>
        <span className="mx-1.5 h-[18px] w-px bg-line-strong" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Vault panel · mocked data
        </span>
        <span className="ml-auto">
          <Mono>{mockVault.slice(0, 10)}…</Mono>
        </span>
      </div>

      <section>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.34em] text-ink-faint">
          Owner panel
        </p>
        <OwnerPanel vault={mockVault} summary={mockSummary} />
      </section>

      <section>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.34em] text-ink-faint">
          Guardian panel
        </p>
        <GuardianPanel vault={mockVault} summary={mockSummary} />
      </section>

      <section>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.34em] text-ink-faint">
          Heir panel
        </p>
        <HeirPanel vault={mockVault} summary={mockSummary} />
      </section>
    </main>
  );
}
