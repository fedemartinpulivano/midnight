"use client";

import { formatDuration } from "@/lib/format";
import { useChainNow } from "@/lib/useChainNow";

export function Countdown({
  target,
  variant = "light",
}: {
  target: number;
  variant?: "light" | "dark";
}) {
  const now = useChainNow();
  const remaining = target - now;
  const tone =
    variant === "dark"
      ? remaining <= 0
        ? "text-moonface"
        : remaining < 3 * 86_400
          ? "text-[#f5c76f]"
          : "text-moonface"
      : remaining <= 0
        ? "text-danger"
        : remaining < 3 * 86_400
          ? "text-warn"
          : "text-ok";

  return (
    <span className={`font-mono text-2xl font-semibold ${tone}`}>
      {remaining <= 0 ? "unlocked" : formatDuration(remaining)}
    </span>
  );
}
