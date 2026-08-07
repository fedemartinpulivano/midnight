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
      className={`rounded-2xl border border-line bg-night-900/80 p-5 backdrop-blur ${className}`}
    >
      {title ? (
        <header className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-ink-faint">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "ok";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-moon-deep text-white hover:bg-moon disabled:bg-night-700 disabled:text-ink-faint",
  ghost:
    "border border-line bg-transparent text-ink hover:border-moon hover:text-moon disabled:text-ink-faint disabled:hover:border-line",
  danger:
    "border border-danger/40 bg-transparent text-danger hover:bg-danger/10 disabled:text-ink-faint disabled:hover:bg-transparent",
  ok: "bg-ok/15 border border-ok/40 text-ok hover:bg-ok/25 disabled:text-ink-faint",
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${buttonStyles[variant]} ${className}`}
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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-night-800 px-3 text-sm text-ink placeholder:text-ink-faint focus:border-moon focus:outline-none focus:ring-2 focus:ring-moon-soft font-mono";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "muted" | "moon";
}) {
  const tones = {
    ok: "bg-ok/10 text-ok border-ok/30",
    warn: "bg-warn/10 text-warn border-warn/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    muted: "bg-night-800 text-ink-muted border-line",
    moon: "bg-moon-soft text-moon border-moon/30",
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
      <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</p>
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
    <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      {message}
    </p>
  );
}
