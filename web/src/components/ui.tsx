"use client";

import { type ReactNode } from "react";

/* Strongroom's vocabulary, expressed through the same primitives every panel
   already renders. Nothing here knows about wagmi; changing these restyles the
   whole dashboard without a contract call moving.

   The shift from the previous look: panels are cut into the steel rather than
   laid on it, so the rounded, shadowed card becomes a flat surface bounded by a
   hairline; labels are engraved mono rather than set in the display face; and
   the primary action is an accent outline, never a fill. */

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-line bg-card p-8 ${className}`}
      style={{ background: "linear-gradient(180deg, #181a22, #101217)" }}
    >
      {title ? (
        <header className="mb-6">
          <h2 className="font-mono text-[10.5px] font-normal uppercase tracking-[0.26em] text-ink-faint">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-faint">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "ok";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-moon text-moon hover:bg-moon/12 active:bg-moon/22 disabled:border-line disabled:text-ink-faint disabled:hover:bg-transparent",
  ghost:
    "border border-line-strong text-ink hover:bg-ink/7 active:bg-ink/14 disabled:text-ink-faint disabled:hover:bg-transparent",
  danger:
    "border border-danger/40 text-danger hover:bg-danger-soft disabled:text-ink-faint disabled:hover:bg-transparent",
  ok: "border border-ok/40 text-ok hover:bg-ok-soft disabled:text-ink-faint disabled:hover:bg-transparent",
};

export function Button({
  children,
  onClick,
  disabled,
  busy,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-none bg-transparent px-5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
    >
      {busy ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-none border border-line bg-well px-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-moon focus:outline-none transition-colors";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "muted" | "moon" | "gold";
}) {
  const tones = {
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    muted: "bg-well text-ink-muted",
    moon: "bg-moon-soft text-moon",
    gold: "bg-gold-soft text-gold",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[11px] tracking-[0.02em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-ink-faint">
        {label}
      </p>
      <p
        className="mt-3 font-display text-5xl font-extrabold tracking-[-0.04em] text-ink"
        style={{ fontVariationSettings: '"wdth" 88' }}
      >
        {value}
      </p>
      {sub ? <p className="mt-2 font-mono text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[13px]">{children}</span>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
      {message}
    </p>
  );
}
