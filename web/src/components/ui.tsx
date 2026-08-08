"use client";

import { type ReactNode } from "react";

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
      className={`rounded-2xl border border-line bg-card p-5 shadow-card ${className}`}
    >
      {title ? (
        <header className="mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            {title}
          </h2>
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "ok";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-moon-deep disabled:bg-well disabled:text-ink-faint shadow-card",
  ghost:
    "border border-line-strong bg-card text-ink hover:border-moon hover:text-moon disabled:text-ink-faint disabled:hover:border-line-strong",
  danger:
    "border border-danger/30 bg-card text-danger hover:bg-danger-soft disabled:text-ink-faint disabled:hover:bg-card",
  ok: "border border-ok/30 bg-ok-soft text-ok hover:bg-ok/15 disabled:text-ink-faint",
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-200 active:translate-y-px ${buttonStyles[variant]} ${className}`}
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink placeholder:text-ink-faint focus:border-moon focus:bg-card focus:outline-none focus:ring-2 focus:ring-moon-soft font-mono transition-colors";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "muted" | "moon" | "gold";
}) {
  const tones = {
    ok: "bg-ok-soft text-ok border-ok/25",
    warn: "bg-warn-soft text-warn border-warn/25",
    danger: "bg-danger-soft text-danger border-danger/25",
    muted: "bg-well text-ink-muted border-line",
    moon: "bg-moon-soft text-moon border-moon/25",
    gold: "bg-gold-soft text-gold border-gold/25",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-4xl font-medium tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[13px]">{children}</span>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
      {message}
    </p>
  );
}
