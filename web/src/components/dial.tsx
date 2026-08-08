"use client";

import { useChainNow } from "@/lib/useChainNow";
import { Countdown } from "./countdown";

/// The silence gauge, drawn as the safe's own dial: a knurled collar with an
/// index ring that fills as the owner's inactivity period runs down. Empty ring
/// = just checked in, closed ring = inheritance unlocked.
///
/// Replaces the almanac's moon phase. Same contract — a 0..1 progress and a
/// size — so the panels that render it did not have to change.
export function Dial({
  progress,
  size = 56,
}: {
  progress: number; // 0 = just alive, 1 = unlocked
  size?: number;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const RADIUS = 15.5;
  const CIRC = 2 * Math.PI * RADIUS;
  // Quantised so the milliseconds between the server render and hydration
  // cannot produce a different attribute string and trip React's check.
  const filled = Math.round(clamped * 1000) / 1000;
  const offset = Math.round(CIRC * (1 - filled) * 100) / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Inactivity progress: ${Math.round(clamped * 100)}%`}
    >
      {/* collar */}
      <circle cx="20" cy="20" r="19" fill="#1c2029" stroke="#3d4353" strokeWidth="1" />
      {/* knurled index marks, the same ring the door wears */}
      <circle
        cx="20"
        cy="20"
        r="17.4"
        fill="none"
        stroke="#7c8398"
        strokeWidth="2.2"
        strokeDasharray="0.5 2.05"
        opacity="0.55"
      />
      {/* travel track */}
      <circle cx="20" cy="20" r={RADIUS} fill="none" stroke="#2a2e39" strokeWidth="2.6" />
      {/* how far the silence has run */}
      <circle
        cx="20"
        cy="20"
        r={RADIUS}
        fill="none"
        stroke={clamped >= 1 ? "#d2cefd" : "#9184d9"}
        strokeWidth="2.6"
        strokeLinecap="butt"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
      />
      {/* machined hub */}
      <circle cx="20" cy="20" r="7.4" fill="#14161c" stroke="#868da2" strokeWidth="1" />
      <circle cx="20" cy="20" r="2.6" fill={clamped >= 1 ? "#9184d9" : "#464c60"} />
    </svg>
  );
}

/// Dial + live countdown + progress readout. With `bare` it renders transparent
/// for use inside an existing panel; otherwise it brings its own steel surface.
export function SilenceWatch({
  lastAlive,
  period,
  unlockedOnChain = false,
  bare = false,
  size = 64,
}: {
  lastAlive: number;
  period: number;
  /// Chain-reported unlock state, kept as a belt-and-braces override even though
  /// the progress below now counts in chain time too.
  unlockedOnChain?: boolean;
  bare?: boolean;
  size?: number;
}) {
  const now = useChainNow();

  const clockProgress = period > 0 ? (now - lastAlive) / period : 0;
  const progress = unlockedOnChain ? 1 : Math.min(clockProgress, 0.999);
  const unlocked = unlockedOnChain || clockProgress >= 1;
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  const content = (
    <div className="relative flex items-center gap-5">
      <Dial progress={progress} size={size} />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-ink-faint">
          Inheritance {unlocked ? "unlocked" : "unlocks in"}
        </p>
        {unlocked ? (
          <span className="font-mono text-2xl text-moonface">claimable</span>
        ) : (
          <Countdown target={lastAlive + period} variant="dark" />
        )}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-[6px] w-28 overflow-hidden bg-[#1f222c]">
            <div
              className="h-full bg-moon"
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-ink-faint">
            {percent}% of the period
          </span>
        </div>
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <div className="relative border border-line bg-well p-5">{content}</div>
  );
}
