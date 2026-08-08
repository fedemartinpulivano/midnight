"use client";

import { useChainNow } from "@/lib/useChainNow";
import { Countdown } from "./countdown";

/// The moon fills as the owner's inactivity progresses: new moon = just
/// checked in, full moon = inheritance unlocked. A phase you can read at a
/// glance — Midnight's signature gauge.
export function MoonPhase({
  progress,
  size = 56,
}: {
  progress: number; // 0 = new moon, 1 = full moon
  size?: number;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  // Keep a visible crescent even right after a heartbeat. Quantised to 1/1000
  // so the milliseconds between server render and hydration can't produce a
  // different cx attribute string and trip React's hydration check.
  const visual = clamped >= 1 ? 1 : Math.max(0.07, Math.round(clamped * 1000) / 1000);
  const shadowCx = Math.round((20 + 34 * visual) * 100) / 100;
  const maskId = `moon-shadow-${Math.round(visual * 1000)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Inactivity progress: ${Math.round(clamped * 100)}%`}
      style={{ filter: "drop-shadow(0 0 10px rgba(242, 229, 191, 0.35))" }}
    >
      <defs>
        <mask id={maskId}>
          <rect width="40" height="40" fill="#fff" />
          <circle cx={shadowCx} cy="20" r="16.6" fill="#000" />
        </mask>
      </defs>
      {/* dark face of the moon, rimmed so it reads on the night card */}
      <circle cx="20" cy="20" r="16" fill="#252e59" stroke="#4c568e" strokeWidth="1" />
      {/* lit face, revealed by the sliding shadow */}
      <circle cx="20" cy="20" r="16" fill="#f2e5bf" mask={`url(#${maskId})`} />
      {clamped >= 1 ? (
        <>
          {/* full-moon craters */}
          <circle cx="14" cy="15" r="2.4" fill="#e4d3a4" />
          <circle cx="25" cy="23" r="3.1" fill="#e4d3a4" />
          <circle cx="18" cy="27" r="1.6" fill="#e4d3a4" />
        </>
      ) : null}
    </svg>
  );
}

/// Moon phase + live countdown + progress readout. With `bare` it renders
/// transparent for use inside an existing night surface; otherwise it brings
/// its own starlit card.
export function MoonWatch({
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
    <div className="relative flex items-center gap-4">
      <MoonPhase progress={progress} size={size} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-starlight/80">
          Moon watch — {unlocked ? "inheritance unlocked" : "unlocks in"}
        </p>
        {unlocked ? (
          <span className="font-mono text-2xl font-semibold text-moonface">full moon</span>
        ) : (
          <Countdown target={lastAlive + period} variant="dark" />
        )}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-moonface/80"
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-starlight/60">
            {percent}% of the period
          </span>
        </div>
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sky p-4 text-starlight">
      <div className="stars-far pointer-events-none absolute inset-0" aria-hidden />
      <div className="stars pointer-events-none absolute inset-0" aria-hidden />
      {content}
    </div>
  );
}
