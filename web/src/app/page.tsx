import Link from "next/link";

const GITHUB = "https://github.com/fedemartinpulivano/midnight";
const CONTRACT = `${GITHUB}/blob/main/contracts/contracts/MidnightVault.sol`;

/* ---------------------------------------------------------------- data */

type Phase = "full" | "gibbous" | "quarter" | "crescent" | "new";

const failureModes: {
  numeral: string;
  phase: Phase;
  title: string;
  today: string;
  answer: string;
}[] = [
  {
    numeral: "I",
    phase: "gibbous",
    title: "Stolen key",
    today:
      "A thief with your key can sign anything. In a plain wallet that is the end of the story — drained in a single transaction.",
    answer:
      "Here a key alone moves nothing. Every withdrawal waits for your guardian threshold to approve it.",
  },
  {
    numeral: "II",
    phase: "quarter",
    title: "Lost key",
    today:
      "Seed burned, hardware dead, passphrase forgotten. The funds sit in plain sight, unreachable forever.",
    answer:
      "Guardians rotate ownership to your new address — behind a 48-hour timelock the real owner can always veto.",
  },
  {
    numeral: "III",
    phase: "new",
    title: "Death or absence",
    today:
      "Heirs are left with lawyers, exchanges and guesswork. Most of it is simply never recovered.",
    answer:
      "After your silence and a 48-hour notice, heirs claim exact weighted shares. Any sign of life cancels it.",
  },
];

const steps: {
  phase: Phase;
  highlight?: boolean;
  title: string;
  body: string;
}[] = [
  {
    phase: "full",
    title: "Create and fund",
    body: "Choose guardians and a threshold, name heirs with exact shares in basis points, set your inactivity period. One contract, deployed once, owned by you.",
  },
  {
    phase: "full",
    title: "Live your life",
    body: "Every deposit, withdrawal request, config change or veto counts as proof of life, and the clock quietly resets to full. A heartbeat costs one click.",
  },
  {
    phase: "quarter",
    title: "If you go silent",
    body: "Once your inactivity period passes, an heir may announce a claim. Nothing moves yet — a 48-hour notice begins to run.",
  },
  {
    phase: "full",
    highlight: true,
    title: "Being alive is the veto",
    body: "There is no cancel button, because none is needed: an announcement only counts while your silence lasts. One heartbeat and it is void.",
  },
  {
    phase: "new",
    title: "The estate passes",
    body: "After the notice, heirs claim their exact shares of the native coin and every tracked token. Dividend accounting means late deposits still split correctly — and guardians cannot block an inheritance.",
  },
];

const mechanisms = [
  {
    n: "01",
    title: "M-of-N guardians",
    body: "One guardian on vacation no longer freezes your funds — and no single guardian holds a veto over you.",
    note: "a request dies only when rejections > N − M",
  },
  {
    n: "02",
    title: "Weighted inheritance",
    body: "Each heir holds a percentage in basis points. Native coin and every tracked ERC20, split to the point.",
    note: "entitled = (balance + claimed) × bps ÷ 10 000",
  },
  {
    n: "03",
    title: "Social recovery",
    body: "Guardians vote to rotate a lost key to your new address. The sitting owner can always veto — if you can veto, the key was never lost.",
    note: "RECOVERY_DELAY = 48 h · owner veto always wins",
  },
  {
    n: "04",
    title: "Timelocked config",
    body: "A stolen key cannot silently swap your guardians: every change waits two days in the open, where guardians can kill it.",
    note: "CONFIG_DELAY = 48 h · threshold vetoes cancel",
  },
  {
    n: "05",
    title: "Minimal proxy clones",
    body: "One implementation, deployed once. Every vault is a 45-byte EIP-1167 proxy to it — cheap to create, identical to verify.",
    note: "EIP-1167 · initializers, never constructors",
  },
  {
    n: "06",
    title: "Zero backend",
    body: "No servers, no database, no custody. The frontend reads the chain directly — if this site disappears, your vault does not.",
    note: "the contract is the only source of truth",
  },
];

const constants = [
  ["MAX_GUARDIANS", "10"],
  ["MAX_HEIRS", "10"],
  ["MAX_TRACKED_TOKENS", "20"],
  ["heir shares", "Σ = 10 000 bps"],
  ["CONFIG_DELAY", "48 h"],
  ["RECOVERY_DELAY", "48 h"],
  ["INHERITANCE_NOTICE", "48 h"],
  ["inactivity period", "1 – 3650 days"],
];

const securityNotes = [
  "50 tests across eight suites — including hostile tokens that revert on transfer and balanceOf",
  "Reentrancy guards on every path that moves value out",
  "No external dependencies in the contracts; custom errors throughout",
  "Non-standard ERC20s handled — USDT-style empty returns accepted, explicit false rejected",
  "Known gaps documented honestly in the repo. No audit yet — and it says so.",
];

/* ------------------------------------------------------- night scenery */

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

/* ------------------------------------------------ almanac instruments */

/** Stylised moon-phase glyph, waning left-lit — the almanac's iconography. */
function PhaseGlyph({
  phase,
  size = 28,
  variant = "night",
}: {
  phase: Phase;
  size?: number;
  variant?: "night" | "day";
}) {
  const lit = variant === "night" ? "#f0e2b8" : "#96701d";
  const shadow = variant === "night" ? "rgba(19, 26, 69, 0.9)" : "rgba(28, 30, 52, 0.12)";
  const ring = variant === "night" ? "rgba(217, 184, 108, 0.45)" : "rgba(150, 112, 29, 0.45)";
  const litArea: Record<Phase, React.ReactNode> = {
    full: <circle cx="12" cy="12" r="9" fill={lit} />,
    gibbous: <path d="M12 3 A9 9 0 0 0 12 21 A5.5 9 0 0 0 12 3 Z" fill={lit} />,
    quarter: <path d="M12 3 A9 9 0 0 0 12 21 Z" fill={lit} />,
    crescent: <path d="M12 3 A9 9 0 0 0 12 21 A5.5 9 0 0 1 12 3 Z" fill={lit} />,
    new: null,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill={shadow} />
      {litArea[phase]}
      <circle cx="12" cy="12" r="9.75" fill="none" stroke={ring} strokeWidth="0.75" />
    </svg>
  );
}

/** The hero instrument: a cratered moon inside a slowly turning brass dial. */
function MoonDial() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-2 right-0 hidden md:block lg:right-4"
    >
      <div className="relative size-72 lg:size-88">
        {/* engraved dial, turning once every four minutes */}
        <svg viewBox="0 0 100 100" className="dial-turn absolute inset-0 size-full">
          <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(217,184,108,0.28)" strokeWidth="0.3" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(217,184,108,0.5)"
            strokeWidth="1.6"
            strokeDasharray="0.28 5.72"
          />
          <circle
            cx="50"
            cy="50"
            r="43.5"
            fill="none"
            stroke="rgba(217,184,108,0.2)"
            strokeWidth="0.3"
          />
          <path d="M50 0.4 L51.6 3.6 L48.4 3.6 Z" fill="rgba(217,184,108,0.75)" />
        </svg>
        {/* the moon itself */}
        <div
          className="moon-breathe absolute inset-[13%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 38% 34%, #fdf8e7 0%, #f0e2b8 40%, #dcc990 66%, #c4ad70 100%)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(14% 14% at 63% 30%, rgba(140,112,40,0.32), transparent 70%)," +
                "radial-gradient(10% 10% at 42% 58%, rgba(140,112,40,0.26), transparent 70%)," +
                "radial-gradient(7% 7% at 70% 62%, rgba(140,112,40,0.3), transparent 70%)," +
                "radial-gradient(5% 5% at 30% 36%, rgba(140,112,40,0.24), transparent 70%)," +
                "radial-gradient(9% 9% at 55% 76%, rgba(140,112,40,0.2), transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "inset -22px -18px 48px rgba(96, 74, 22, 0.34)" }}
          />
        </div>
      </div>
    </div>
  );
}

/** Small-caps section label between two engraved rules. */
function Eyebrow({ children, variant = "day" }: { children: React.ReactNode; variant?: "night" | "day" }) {
  const rule = variant === "night" ? "rule-brass-night" : "rule-brass";
  const text = variant === "night" ? "text-brass" : "text-gold";
  return (
    <div className="flex items-center gap-5">
      <span className={`${rule} w-10 shrink-0 sm:w-16`} />
      <span className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${text}`}>
        {children}
      </span>
      <span className={`${rule} flex-1`} />
    </div>
  );
}

/** Wax seal — the deed is signed. */
function WaxSeal() {
  return (
    <div aria-hidden className="relative size-24 -rotate-8">
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full drop-shadow-lg">
        <defs>
          <radialGradient id="wax" cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#c1503a" />
            <stop offset="55%" stopColor="#a63a2a" />
            <stop offset="100%" stopColor="#6f2317" />
          </radialGradient>
          <path id="seal-arc" d="M48 13.5 a34.5 34.5 0 1 1 -0.01 0" fill="none" />
        </defs>
        <path
          d="M48 2c6 0 9 3.4 14.5 4.6C68.9 8 74 6.8 78.6 11.4 83.2 16 82 21.1 83.4 27.5 84.6 33 88 36 88 42s-3.4 9-4.6 14.5C82 62.9 83.2 68 78.6 72.6 74 77.2 68.9 76 62.5 77.4 57 78.6 54 82 48 82s-9-3.4-14.5-4.6C27.1 76 22 77.2 17.4 72.6 12.8 68 14 62.9 12.6 56.5 11.4 51 8 48 8 42s3.4-9 4.6-14.5C14 21.1 12.8 16 17.4 11.4 22 6.8 27.1 8 33.5 6.6 39 5.4 42 2 48 2Z"
          fill="url(#wax)"
          transform="translate(0 6)"
        />
        <circle cx="48" cy="48" r="30" fill="none" stroke="rgba(255,224,204,0.35)" strokeWidth="1" />
        <text
          fontSize="6.2"
          letterSpacing="1.6"
          fill="rgba(255,224,204,0.55)"
          style={{ fontFamily: "var(--font-spline-mono), monospace" }}
        >
          <textPath href="#seal-arc" startOffset="2%">
            MIDNIGHT · NON CUSTODIAL · MMXXVI ·
          </textPath>
        </text>
        <text
          x="48"
          y="60"
          textAnchor="middle"
          fontSize="34"
          fill="rgba(255,230,210,0.85)"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontStyle: "italic" }}
        >
          M
        </text>
      </svg>
    </div>
  );
}

function CrescentMark({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 3 A9 9 0 1 0 12 21 A7 9 0 0 1 12 3 Z" fill="currentColor" />
    </svg>
  );
}

/* -------------------------------------------------------------- page */

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* ================= NIGHT — hero and the three failure modes ===== */}
      <div className="night-sky relative overflow-hidden">
        <div className="stars-far pointer-events-none absolute inset-0" aria-hidden />
        <div className="stars pointer-events-none absolute inset-0" aria-hidden />
        <CloudLayer image={CLOUD_BACK} tile={900} duration={150} top="6%" height="42%" opacity={0.1} />

        <div className="relative mx-auto max-w-5xl px-6">
          <nav className="rise rise-1 flex items-center justify-between py-8">
            <span className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-paper">
              <CrescentMark className="size-3.5 text-moonface" />
              midnight
            </span>
            <div className="flex items-center gap-7">
              <div className="hidden items-center gap-7 text-[13px] font-medium text-starlight/80 sm:flex">
                <a href="#how" className="transition-colors hover:text-moonface">
                  How it works
                </a>
                <a href="#mechanisms" className="transition-colors hover:text-moonface">
                  Mechanisms
                </a>
                <a href="#fine-print" className="transition-colors hover:text-moonface">
                  The fine print
                </a>
              </div>
              <Link
                href="/app"
                className="rounded-full border border-brass/40 px-4.5 py-2 text-sm font-medium text-moonface transition-colors hover:border-brass hover:bg-brass/10"
              >
                Open app
              </Link>
            </div>
          </nav>

          <section className="relative pb-36 pt-16 md:pt-20">
            <MoonDial />
            <p className="rise rise-2 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-brass">
              <span className="rule-brass-night w-10" />
              Non-custodial recovery vault · BNB Chain
            </p>
            <h1 className="rise rise-3 mt-7 max-w-3xl font-display text-6xl font-medium leading-[1.02] tracking-tight text-paper md:text-[5.4rem]">
              The vault that{" "}
              <em className="font-light italic text-moonface">survives&nbsp;you</em>.
            </h1>
            <p className="rise rise-4 mt-7 max-w-xl text-lg leading-relaxed text-starlight">
              Guardians approve withdrawals. Heirs inherit after silence. A lost key
              rotates away. One contract enforces all of it — no server, no custodian,
              nobody to trust but the code you can read.
            </p>
            <div className="rise rise-5 mt-10 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-full bg-moonface px-7 py-3 text-sm font-semibold text-ink shadow-moon transition-all hover:bg-brass"
              >
                Create your vault
              </Link>
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-paper transition-colors hover:border-brass/60 hover:text-moonface"
              >
                Read the contracts
              </a>
            </div>
            <p className="rise rise-6 mt-12 font-mono text-xs tracking-wide text-starlight/55">
              50 tests passing&ensp;·&ensp;0 backend&ensp;·&ensp;1 contract per
              vault&ensp;·&ensp;MIT
            </p>
          </section>

          {/* ---- the three failure modes, catalogued while it is dark --- */}
          <section className="relative pb-28">
            <div className="">
              <Eyebrow variant="night">What can go wrong</Eyebrow>
              <h2 className="mt-6 text-center font-display text-4xl font-medium tracking-tight text-paper">
                Three ways crypto{" "}
                <em className="font-light italic text-moonface">disappears</em>.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {failureModes.map((mode) => (
                <article
                  key={mode.numeral}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-[2px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-light italic text-brass">
                      {mode.numeral}
                    </span>
                    <PhaseGlyph phase={mode.phase} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-medium text-paper">
                    {mode.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-starlight/85">
                    {mode.today}
                  </p>
                  <div className="rule-brass-night my-5" />
                  <p className="text-sm leading-relaxed text-moonface">{mode.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <CloudLayer image={CLOUD_FRONT} tile={700} duration={85} top="3%" height="38%" opacity={0.14} blend />
      </div>

      {/* ================= DAWN ========================================= */}
      <div aria-hidden className="dawn h-[38vh] min-h-56" />

      {/* ================= DAY — the almanac ============================ */}
      <div className="mx-auto max-w-5xl px-6">
        {/* ---- how it works: a month in the life ---------------------- */}
        <section id="how" className="scroll-mt-16 py-20 md:py-24">
          <div className="">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-6 text-center font-display text-4xl font-medium tracking-tight">
              A month in the life of a{" "}
              <em className="font-light italic text-gold">vault</em>.
            </h2>
          </div>

          <ol className="relative mx-auto mt-14 max-w-2xl">
            <span
              aria-hidden
              className="absolute bottom-6 left-[17px] top-6 w-px bg-line-strong/70"
            />
            {steps.map((step, i) => (
              <li key={step.title} className="relative flex gap-6 pb-12 pl-0 last:pb-0">
                <span className="relative z-10 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card shadow-card">
                  <PhaseGlyph phase={step.phase} size={22} variant="day" />
                </span>
                <div>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-ink-faint">
                    0{i + 1}
                  </p>
                  <h3
                    className={`mt-1 font-display text-xl font-medium ${
                      step.highlight ? "text-gold" : "text-ink"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mx-auto mt-12 max-w-2xl border-l-2 border-gold/40 pl-5 text-sm leading-relaxed text-ink-muted">
            Guardians deliberately <span className="font-semibold text-ink">cannot veto an inheritance</span> —
            a colluding majority could otherwise strand your heirs forever, which is the
            exact failure this vault exists to prevent. Only your own liveness stops the
            clock.
          </p>
        </section>

        {/* ---- the six mechanisms, as a ledger ------------------------ */}
        <section id="mechanisms" className="scroll-mt-16 py-16 md:py-20">
          <div className="">
            <Eyebrow>The mechanisms</Eyebrow>
            <h2 className="mt-6 text-center font-display text-4xl font-medium tracking-tight">
              Six rules, engraved{" "}
              <em className="font-light italic text-gold">on-chain</em>.
            </h2>
          </div>
          <div className="mt-12 grid gap-x-16 md:grid-cols-2">
            {mechanisms.map((m) => (
              <div key={m.n} className="border-b border-line py-7">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-sm font-medium italic text-gold">
                    {m.n}
                  </span>
                  <h3 className="font-display text-lg font-medium text-ink">{m.title}</h3>
                </div>
                <p className="mt-2 pl-9 text-sm leading-relaxed text-ink-muted">{m.body}</p>
                <p className="mt-3 pl-9 font-mono text-xs text-gold/90">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- the fine print ----------------------------------------- */}
        <section id="fine-print" className="scroll-mt-16 py-16 md:py-20">
          <div className="">
            <Eyebrow>The fine print</Eyebrow>
            <h2 className="mt-6 text-center font-display text-4xl font-medium tracking-tight">
              Short enough to actually{" "}
              <em className="font-light italic text-gold">read</em>.
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-16">
            <div className="">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                Constants of the vault
              </p>
              <dl className="mt-4 font-mono text-[13px]">
                {constants.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5"
                  >
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={CONTRACT}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-sm font-medium text-moon underline-offset-4 transition-colors hover:text-moon-deep hover:underline"
              >
                Every rule on this page is a line in MidnightVault.sol →
              </a>
            </div>

            <div className="">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                Security posture
              </p>
              <ul className="mt-4 space-y-3.5">
                {securityNotes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                    <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold/70" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* ================= DUSK — the closing call ====================== */}
      <div className="dusk relative overflow-hidden">
        <div className="stars-far pointer-events-none absolute inset-x-0 bottom-0 h-2/3" aria-hidden />
        <div className="stars pointer-events-none absolute inset-x-0 bottom-0 h-1/2" aria-hidden />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-52 text-center md:pt-64">
          <PhaseGlyph phase="crescent" size={34} />
          <h2 className="mt-8 max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-paper md:text-5xl">
            While you sleep, the vault{" "}
            <em className="font-light italic text-moonface">keeps watch</em>.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-starlight">
            One transaction to create it. Fund it, name your people, and stop being a
            single point of failure.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="rounded-full bg-moonface px-7 py-3 text-sm font-semibold text-ink shadow-moon transition-all hover:bg-brass"
            >
              Create your vault
            </Link>
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-paper transition-colors hover:border-brass/60 hover:text-moonface"
            >
              Star it on GitHub
            </a>
          </div>
          <div className="mt-14">
            <WaxSeal />
          </div>

          <footer className="mt-20 w-full border-t border-white/10 py-7">
            <div className="flex flex-col items-center justify-between gap-3 text-xs text-starlight/60 sm:flex-row">
              <span className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-paper/85">
                <CrescentMark className="size-2.5 text-moonface/80" />
                midnight
              </span>
              <span>Rebuilt from HackITBA 2026&apos;s Vaultix — improved from zero.</span>
              <span className="flex items-center gap-4">
                <a href={GITHUB} target="_blank" rel="noreferrer" className="transition-colors hover:text-moonface">
                  GitHub
                </a>
                <span>MIT</span>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
