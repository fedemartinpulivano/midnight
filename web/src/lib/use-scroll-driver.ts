"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `draw` on every scroll and resize, coalesced to one animation frame.
 *
 * Scroll choreography is written straight onto the DOM rather than routed
 * through state: a re-render per frame would be both slower and jumpier than
 * setting the handful of transforms these scenes actually change.
 */
export function useScrollDriver(draw: () => void) {
  const latest = useRef(draw);
  latest.current = draw;

  useEffect(() => {
    let frame = 0;

    const run = () => {
      frame = 0;
      latest.current();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };

    // Paint once on mount so a page restored mid-scroll is already correct.
    latest.current();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
}
