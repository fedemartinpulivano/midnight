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

// Procedural night cirrus: stitched fractal turbulence rendered to alpha,
// so the repeat-x drift loops without a visible seam.
const CLOUD_BACK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='380'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.006 0.018' numOctaves='4' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 -0.32'/%3E%3C/filter%3E%3Crect width='900' height='380' filter='url(%23c)'/%3E%3C/svg%3E\")";

const CLOUD_FRONT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='240'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01 0.028' numOctaves='4' seed='21' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.85 -0.38'/%3E%3C/filter%3E%3Crect width='700' height='240' filter='url(%23c)'/%3E%3C/svg%3E\")";

function CloudLayer({
  image,
  tile,
  duration,
  top,
  height,
  opacity,
  blend,
}: {
  image: string;
  tile: number;
  duration: number;
  top: string;
  height: string;
  opacity: number;
  blend?: boolean;
}) {
  return (
    <div className="cloud-layer" aria-hidden>
      <div
        className="cloud-strip"
        style={
          {
            "--tile": `${tile}px`,
            "--dur": `${duration}s`,
            top,
            height,
            opacity,
            backgroundImage: image,
            mixBlendMode: blend ? "screen" : undefined,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function FullMoon() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-6 right-2 hidden md:block"
    >
      <div
        className="size-56 rounded-full shadow-moon lg:size-72"
        style={{
          background:
            "radial-gradient(circle at 38% 34%, #fdf8e7 0%, #f2e5bf 42%, #dcc990 68%, #c8b276 100%)",
          boxShadow:
            "0 0 90px 26px rgba(242, 229, 191, 0.28), inset -20px -16px 46px rgba(140, 112, 40, 0.28)",
        }}
      />
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* ---- midnight sky: it dawns into paper as you scroll ---- */}
      <div className="night-sky relative overflow-hidden">
        <div className="stars-far pointer-events-none absolute inset-0" aria-hidden />
        <div className="stars pointer-events-none absolute inset-0" aria-hidden />
        <CloudLayer
          image={CLOUD_BACK}
          tile={900}
          duration={150}
          top="8%"
          height="55%"
          opacity={0.1}
        />
        <div className="relative mx-auto max-w-5xl px-6">
          <nav className="rise rise-1 flex items-center justify-between py-8">
            <span className="font-display text-xl font-semibold tracking-tight text-paper">
              <span className="mr-1.5 inline-block size-2.5 rounded-full bg-moonface align-middle" />
              midnight
            </span>
            <Link
              href="/app"
              className="rounded-xl border border-white/25 px-4 py-2 text-sm font-medium text-paper transition-colors hover:border-moonface hover:text-moonface"
            >
              Open app
            </Link>
          </nav>

          <section className="relative flex flex-col items-start justify-center pb-40 pt-14">
            <FullMoon />
            <p className="rise rise-2 mb-5 rounded-full border border-moonface/30 bg-white/5 px-3.5 py-1 text-xs font-semibold tracking-wide text-moonface">
              Non-custodial recovery vault on BNB Chain
            </p>
            <h1 className="rise rise-3 max-w-3xl font-display text-6xl font-medium leading-[1.04] tracking-tight text-paper md:text-7xl">
              The vault that{" "}
              <em className="font-light italic text-moonface">survives&nbsp;you</em>.
            </h1>
            <p className="rise rise-4 mt-7 max-w-2xl text-lg leading-relaxed text-starlight">
              Midnight protects your crypto against the three ways people actually lose it:
              stolen keys, lost keys, and death. Guardians approve withdrawals, heirs inherit
              after inactivity, and a lost key can be recovered — all enforced by a smart
              contract nobody else controls. While you sleep, the vault keeps watch.
            </p>
            <div className="rise rise-5 mt-9 flex gap-3">
              <Link
                href="/app"
                className="rounded-xl bg-moonface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft"
              >
                Create your vault
              </Link>
              <a
                href="https://github.com/fedemartinpulivano/midnight"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/25 px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-moonface hover:text-moonface"
              >
                Read the contracts
              </a>
            </div>
            <p className="rise rise-6 mt-10 flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium tracking-wide text-starlight/60">
              <span>35 passing tests</span>
              <span>·</span>
              <span>zero backend</span>
              <span>·</span>
              <span>one contract per vault</span>
              <span>·</span>
              <span>MIT licensed</span>
            </p>
          </section>
        </div>
        {/* cirrus drifting across the whole sky — and across the moon, lit by it */}
        <CloudLayer
          image={CLOUD_FRONT}
          tile={700}
          duration={85}
          top="4%"
          height="52%"
          opacity={0.15}
          blend
        />
      </div>

      {/* ---- daylight: the product, in paper ---- */}
      <div className="mx-auto max-w-5xl px-6">
        <section className="py-14">
          <h2 className="font-display text-3xl font-medium tracking-tight">
            Three failure modes. <span className="italic text-moon">One vault.</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {failureModes.map((mode) => (
              <div
                key={mode.title}
                className="stars-far rounded-2xl bg-sky p-6 text-paper shadow-lift"
              >
                <h3 className="font-display text-lg font-medium text-moonface">{mode.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-starlight">{mode.body}</p>
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
      </div>
    </main>
  );
}
