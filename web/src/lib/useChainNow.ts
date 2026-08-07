"use client";

import { useEffect, useRef, useState } from "react";
import { useBlock } from "wagmi";

/// Seconds since the epoch, anchored to the chain instead of the browser.
///
/// Every deadline in this app — inactivity, request TTLs, timelocks, the
/// inheritance notice — is enforced against `block.timestamp`. Counting down with
/// `Date.now()` means a user whose system clock is off sees the wrong number, and
/// on a time-warped dev chain the two drift by days. So we anchor to the latest
/// block timestamp and tick locally between blocks, which keeps the display smooth
/// without lying about which clock actually decides.
export function useChainNow(): number {
  const { data: block } = useBlock({ watch: true });
  const anchor = useRef<{ chain: number; local: number } | null>(null);

  // Browser time is the seed; the first block replaces it within a tick.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const chainTimestamp = block ? Number(block.timestamp) : null;

  useEffect(() => {
    if (chainTimestamp === null) return;
    anchor.current = { chain: chainTimestamp, local: Math.floor(Date.now() / 1000) };
  }, [chainTimestamp]);

  useEffect(() => {
    const timer = setInterval(() => {
      const local = Math.floor(Date.now() / 1000);
      const current = anchor.current;
      setNow(current ? current.chain + (local - current.local) : local);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}
