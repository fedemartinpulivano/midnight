"use client";

import { useEffect, useState } from "react";
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
  // Shadow disc slides off to the right as the moon fills.
  const shadowCx = 20 + 34 * clamped;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Inactivity progress: ${Math.round(clamped * 100)}%`}
    >
      <defs>
        <mask id={`moon-shadow-${Math.round(clamped * 100)}`}>
          <rect width="40" height="40" fill="#fff" />
          <circle cx={shadowCx} cy="20" r="17" fill="#000" />
        </mask>
      </defs>
      {/* dark face of the moon */}
      <circle cx="20" cy="20" r="16" fill="#1d2547" stroke="#3a4370" strokeWidth="0.75" />
      {/* lit face, revealed by the sliding shadow */}
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="#f2e5bf"
        mask={`url(#moon-shadow-${Math.round(clamped * 100)})`}
      />
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

/// Night-sky card pairing the moon phase with the live countdown.
export function MoonWatch({
  lastAlive,
  period,
  compact = false,
}: {
  lastAlive: number;
  period: number;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(timer);
  }, []);

  const progress = period > 0 ? (now - lastAlive) / period : 0;
  const unlocked = progress >= 1;

  return (
    <div className="stars-far relative overflow-hidden rounded-2xl bg-sky p-4 text-starlight">
      <div className="stars pointer-events-none absolute inset-0" aria-hidden />
      <div className={`relative flex items-center gap-4 ${compact ? "" : "sm:gap-5"}`}>
        <MoonPhase progress={progress} size={compact ? 48 : 64} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-starlight/70">
            Moon watch — {unlocked ? "inheritance unlocked" : "inheritance unlocks in"}
          </p>
          <Countdown target={lastAlive + period} variant="dark" />
          {!unlocked && !compact ? (
            <p className="mt-1 text-[11px] text-starlight/60">
              Full moon = heirs can claim. Any owner action resets it to new moon.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
