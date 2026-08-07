export type VaultSummary = {
  owner: `0x${string}`;
  guardians: readonly `0x${string}`[];
  threshold: bigint;
  heirs: readonly `0x${string}`[];
  shares: readonly number[];
  inactivityPeriod: bigint;
  requestTTL: bigint;
  lastAlive: bigint;
  nativeBalance: bigint;
  trackedTokens: readonly `0x${string}`[];
  requestCount: bigint;
  minValidRequestId: bigint;
  recoveryCount: bigint;
  minValidRecoveryId: bigint;
  inheritanceUnlocked: boolean;
  inheritanceUnlocksAt: bigint;
  inheritanceAnnouncedAt: bigint;
  inheritanceClaimableAt: bigint;
  inheritanceClaimable: boolean;
  hasPendingConfig: boolean;
};

export type PendingConfigData = readonly [
  exists: boolean,
  guardians: readonly `0x${string}`[],
  threshold: bigint,
  heirs: readonly `0x${string}`[],
  shares: readonly number[],
  inactivityPeriod: bigint,
  requestTTL: bigint,
  applyAfter: bigint,
  vetoes: number,
];

export type WithdrawalRequestData = {
  token: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  approvals: number;
  rejections: number;
  status: number;
};

export type RecoveryData = {
  newOwner: `0x${string}`;
  proposedAt: bigint;
  approvals: number;
  executed: boolean;
  cancelled: boolean;
};

export function sameAddress(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
