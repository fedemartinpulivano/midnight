import Link from "next/link";

const features = [
  {
    n: "01",
    title: "M-of-N guardians",
    body: "Pick any number of guardians and a threshold. One guardian on vacation no longer freezes your funds — and no single guardian can veto you.",
  },
  {
    n: "02",
    title: "Weighted inheritance",
    body: "Assign each heir a percentage. After your configured inactivity period, they claim exactly their share — native coin and every tracked ERC20.",
  },
  {
    n: "03",
    title: "Social recovery",
    body: "Lost your key? Guardians vote to rotate ownership to your new address, behind a timelock the real owner can always veto.",
  },
  {
    n: "04",
    title: "Timelocked config",
    body: "A stolen key can't silently swap your guardians: every configuration change waits 48 hours and guardians can veto it.",
  },
  {
    n: "05",
    title: "Minimal proxy clones",
    body: "Each vault is an EIP-1167 clone — one cheap deployment instead of three full contracts per user.",
  },
  {
    n: "06",
    title: "Zero backend",
    body: "No servers, no database, no custody. The frontend reads the chain directly; the contract is the only source of truth.",
  },
];

const failureModes = [
  {
    title: "Stolen key",
    body: "A thief holding your key still can't move funds — withdrawals execute only after your guardian threshold approves.",
  },
  {
    title: "Lost key",
    body: "Guardians rotate ownership to your new address after a 48-hour timelock. Your funds never move; only the key does.",
  },
  {
    title: "Death or absence",
    body: "After your inactivity period, heirs claim their exact shares. No lawyers, no exchange support tickets, no lost coins.",
  },
];

function Moon() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-10 right-0 -z-10 hidden md:block"
    >
      <div
        className="size-64 rounded-full lg:size-80"
        style={{
          background:
            "radial-gradient(circle at 38% 34%, #fffdf6 0%, #f6edd2 38%, #e9dcb4 62%, rgba(233, 220, 180, 0.0) 72%)",
          boxShadow:
            "0 0 80px 24px rgba(168, 129, 31, 0.14), inset -18px -14px 40px rgba(168, 129, 31, 0.18)",
        }}
      />
    </div>
  );
}

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <nav className="rise rise-1 flex items-center justify-between py-8">
        <span className="font-display text-xl font-semibold tracking-tight">
          <span className="mr-1.5 inline-block size-2.5 rounded-full bg-gold align-middle" />
          midnight
        </span>
        <Link
          href="/app"
          className="rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-moon hover:text-moon"
        >
          Open app
        </Link>
      </nav>

      <section className="relative flex flex-1 flex-col items-start justify-center py-16">
        <Moon />
        <p className="rise rise-2 mb-5 rounded-full border border-gold/30 bg-gold-soft px-3.5 py-1 text-xs font-semibold tracking-wide text-gold">
          Non-custodial recovery vault on BNB Chain
        </p>
        <h1 className="rise rise-3 max-w-3xl font-display text-6xl font-medium leading-[1.04] tracking-tight md:text-7xl">
          The vault that{" "}
          <em className="font-light italic text-moon">survives&nbsp;you</em>.
        </h1>
        <p className="rise rise-4 mt-7 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Midnight protects your crypto against the three ways people actually lose it:
          stolen keys, lost keys, and death. Guardians approve withdrawals, heirs inherit
          after inactivity, and a lost key can be recovered — all enforced by a smart
          contract nobody else controls.
        </p>
        <div className="rise rise-5 mt-9 flex gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-colors hover:bg-moon-deep"
          >
            Create your vault
          </Link>
          <a
            href="https://github.com/fedemartinpulivano/midnight"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-line-strong bg-card px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-moon hover:text-moon"
          >
            Read the contracts
          </a>
        </div>
        <p className="rise rise-6 mt-10 flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium tracking-wide text-ink-faint">
          <span>35 passing tests</span>
          <span>·</span>
          <span>zero backend</span>
          <span>·</span>
          <span>one contract per vault</span>
          <span>·</span>
          <span>MIT licensed</span>
        </p>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="rise rise-1 font-display text-3xl font-medium tracking-tight">
          Three failure modes. <span className="italic text-moon">One vault.</span>
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {failureModes.map((mode, index) => (
            <div
              key={mode.title}
              className={`rise rise-${index + 2} rounded-2xl bg-ink p-6 text-paper shadow-lift`}
            >
              <h3 className="font-display text-lg font-medium text-gold-soft">{mode.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/75">{mode.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 py-14 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.n}
            className="group rounded-2xl border border-line bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-moon/40 hover:shadow-lift"
          >
            <p className="font-display text-sm font-medium text-gold">{feature.n}</p>
            <h3 className="mt-2 text-sm font-semibold text-ink group-hover:text-moon">
              {feature.title}
            </h3>
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
