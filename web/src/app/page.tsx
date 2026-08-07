import Link from "next/link";

const features = [
  {
    title: "M-of-N guardians",
    body: "Pick any number of guardians and a threshold. One guardian on vacation no longer freezes your funds — and no single guardian can veto you.",
  },
  {
    title: "Weighted inheritance",
    body: "Assign each heir a percentage. After your configured inactivity period, they claim exactly their share — native coin and every tracked ERC20.",
  },
  {
    title: "Social recovery",
    body: "Lost your key? Guardians vote to rotate ownership to your new address, behind a timelock the real owner can always veto.",
  },
  {
    title: "Timelocked config",
    body: "A stolen key can't silently swap your guardians: every configuration change waits 48 hours and guardians can veto it.",
  },
  {
    title: "Minimal proxy clones",
    body: "Each vault is an EIP-1167 clone — one cheap deployment instead of three full contracts per user.",
  },
  {
    title: "Zero backend",
    body: "No servers, no database, no custody. The frontend reads the chain directly; the contract is the only source of truth.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <nav className="flex items-center justify-between py-8">
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-moon">●</span> midnight
        </span>
        <Link
          href="/app"
          className="rounded-xl border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-moon hover:text-moon"
        >
          Open app
        </Link>
      </nav>

      <section className="flex flex-1 flex-col items-start justify-center py-16">
        <p className="mb-4 rounded-full border border-moon/30 bg-moon-soft px-3 py-1 text-xs font-medium text-moon">
          Non-custodial recovery vault on BNB Chain
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          The vault that
          <span className="text-moon"> survives you</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Midnight protects your crypto against the three ways people actually lose it:
          stolen keys, lost keys, and death. Guardians approve withdrawals, heirs inherit
          after inactivity, and a lost key can be recovered — all enforced by a smart
          contract nobody else controls.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-moon-deep px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-moon"
          >
            Create your vault
          </Link>
          <a
            href="https://github.com/fedemartinpulivano/midnight"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-moon hover:text-moon"
          >
            Read the contracts
          </a>
        </div>
      </section>

      <section className="grid gap-4 pb-20 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-line bg-night-900/70 p-5"
          >
            <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Midnight — rebuilt from HackITBA 2026&apos;s Vaultix, improved from zero. MIT licensed.
      </footer>
    </main>
  );
}
