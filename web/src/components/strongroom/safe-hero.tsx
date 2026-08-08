"use client";

import { useRef } from "react";
import { Mark } from "./mark";
import { useSealedNavigate } from "./vault-door";
import { useScrollDriver } from "@/lib/use-scroll-driver";
import { ease, seg, sectionProgress } from "@/lib/ease";
import styles from "./safe-hero.module.css";

const ACCENT = "#9184d9";
const PIN_DARK = "#464c60";
const LAMP_DARK = "#3a3e52";

const BOLT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SPOKE_ANGLES = [0, 72, 144, 216, 288];

const DOOR_STATS = [
  { value: "$3.4B", label: "stolen" },
  { value: "158K", label: "wallets" },
  { value: "3.7M", label: "btc lost" },
];

const CHAMBER_STATS = [
  { value: "$3.4B", label: "stolen in 2025" },
  { value: "158K", label: "wallets drained" },
  { value: "3.7M", label: "BTC lost forever" },
  { value: "4–5", label: "BTC lost daily" },
];

const BOLT_SCHEDULE = [
  { n: "01", name: "guardians", spec: "M of N" },
  { n: "02", name: "timelock", spec: "48 h, vetoable" },
  { n: "03", name: "silence", spec: "heirs by bps" },
];

export function SafeHero() {
  const sealedNavigate = useSealedNavigate();

  const section = useRef<HTMLElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const doorShadow = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLDivElement>(null);
  const spill = useRef<HTMLDivElement>(null);
  const wheel = useRef<SVGGElement>(null);
  const bolts = useRef<(SVGRectElement | null)[]>([]);
  const pin = useRef<SVGCircleElement>(null);
  const lamp = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);

  useScrollDriver(() => {
    if (!section.current) return;
    const p = sectionProgress(section.current);

    // The order of operations of an actual vault door: wheel, bolts, seat,
    // hinge, and only then the camera through the hole.
    const turn = ease(seg(p, 0.03, 0.38));
    const retract = seg(p, 0.34, 0.5);
    const pull = ease(seg(p, 0.48, 0.6));
    const swing = ease(seg(p, 0.52, 0.86));
    const push = ease(seg(p, 0.78, 1));
    const shown = seg(p, 0.6, 0.9);
    const litUp = retract > 0.6;

    if (cam.current) {
      cam.current.style.transform = `scale(${(1 + 3.2 * push).toFixed(3)})`;
      cam.current.style.opacity = (1 - seg(push, 0.55, 1)).toFixed(3);
    }
    if (door.current) {
      door.current.style.transform = `rotateY(${(-118 * swing).toFixed(2)}deg) translateZ(${(30 * pull).toFixed(1)}px)`;
      door.current.style.opacity = (1 - seg(swing, 0.82, 1)).toFixed(3);
    }
    if (doorShadow.current) {
      doorShadow.current.style.filter = `drop-shadow(0 ${(10 + 30 * pull).toFixed(0)}px ${(24 + 46 * pull).toFixed(0)}px rgba(0,0,0,${(0.5 + 0.3 * pull).toFixed(2)}))`;
    }
    if (spill.current) spill.current.style.opacity = swing.toFixed(3);
    if (wheel.current) {
      wheel.current.setAttribute(
        "transform",
        `rotate(${(-612 * turn).toFixed(1)} 230 230)`,
      );
    }

    const boltY = (2 + 38 * retract).toFixed(1);
    bolts.current.forEach((b) => b?.setAttribute("y", boltY));

    pin.current?.setAttribute("fill", litUp ? ACCENT : PIN_DARK);
    if (lamp.current) {
      const c = litUp ? ACCENT : LAMP_DARK;
      lamp.current.style.background = c;
      lamp.current.style.boxShadow = `0 0 10px ${c}`;
    }
    if (status.current) {
      status.current.textContent =
        turn < 0.12
          ? "Sealed · 8 bolts engaged"
          : retract < 0.95
            ? "Turning the wheel…"
            : swing > 0.5
              ? "Open"
              : "Boltwork clear";
    }
    if (reveal.current) {
      reveal.current.style.opacity = shown.toFixed(3);
      reveal.current.style.transform = `scale(${(0.9 + 0.1 * shown).toFixed(3)})`;
    }
    if (hint.current) {
      hint.current.style.opacity = (1 - seg(p, 0, 0.09)).toFixed(3);
    }
  });

  return (
    <section ref={section} className={styles.section}>
      <div className={styles.stage}>
        {/* ── the chamber, and what is written on its back wall ── */}
        <div className={styles.chamber}>
          <div className={styles.chamberGrain} />

          <div ref={reveal} className={styles.reveal}>
            <div className={styles.revealInner}>
              <p className={styles.revealKicker}>Inside the strongroom</p>
              <h1 className={styles.revealTitle}>
                Three bolts, and none of them is you.
              </h1>
              <p className={styles.revealBody}>
                Guardians approve every withdrawal. A lost key rotates away
                behind a timelock you can veto. Heirs inherit only after real
                silence. One contract enforces all three — no server, no
                database, no custodian.
              </p>
              <div className={styles.revealActions}>
                <button
                  type="button"
                  className={`btn btn-primary ${styles.cta}`}
                  onClick={() => sealedNavigate("/app")}
                >
                  Create your vault
                </button>
                <a
                  className={`btn btn-secondary ${styles.cta}`}
                  href="https://github.com/fedemartinpulivano/midnight"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the contracts
                </a>
              </div>
              <div className={styles.revealStats}>
                {CHAMBER_STATS.map((s) => (
                  <div key={s.label}>
                    <div className={styles.revealStatValue}>{s.value}</div>
                    <div className={styles.revealStatLabel}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── the face of the safe; the camera flies through its opening ── */}
        <div ref={cam} className={styles.cam}>
          <div className={styles.plate}>
            <div className={styles.plateGrain} />
            <div className={styles.plateSheen} />
            <div className={styles.plateInner} />
          </div>

          <div className={styles.faceGrid}>
            <div className={styles.brand}>
              <Mark size={34} variant="face" />
              <span className={styles.brandName}>Strongroom</span>
            </div>

            <div className={styles.modelPlate}>
              <div>Compact contract</div>
              <div>Midnight network</div>
            </div>

            <div className={styles.pitch}>
              <p className={styles.pitchKicker}>Non-custodial recovery vault</p>
              <h2 className={styles.pitchTitle}>
                A safe with one lock is not a safe.
              </h2>
              <p className={styles.pitchBody}>
                Your private key is the vault, the will and the night guard all
                at once — so losing it once loses everything three ways.
              </p>
            </div>

            <div className={styles.schedule}>
              <p className={styles.scheduleKicker}>Bolt schedule</p>
              <div className={styles.scheduleList}>
                {BOLT_SCHEDULE.map((b) => (
                  <div key={b.n} className={styles.scheduleRow}>
                    <span className={styles.scheduleNum}>{b.n}</span>
                    &nbsp;&nbsp;{b.name}&nbsp;&nbsp;{b.spec}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.faceStats}>
              {DOOR_STATS.map((s) => (
                <div key={s.label}>
                  <div className={styles.faceStatValue}>{s.value}</div>
                  <div className={styles.faceStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.status}>
              <span ref={lamp} className={styles.lamp} />
              <span ref={status}>Sealed · 8 bolts engaged</span>
            </div>
          </div>

          <div ref={spill} className={styles.spill} />
          <div className={styles.lip} />

          <div className={styles.hinges}>
            <div className={styles.knuckle} />
            <div className={styles.knuckle} />
          </div>

          <div ref={doorShadow} className={styles.doorShadow}>
            <div ref={door} className={styles.door}>
              <div className={styles.doorBack} />
              <svg
                viewBox="0 0 460 460"
                width="100%"
                height="100%"
                className={styles.doorFace}
              >
                <defs>
                  <linearGradient id="srCollar" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#6a7186" />
                    <stop offset=".45" stopColor="#2c313d" />
                    <stop offset="1" stopColor="#171a21" />
                  </linearGradient>
                  <radialGradient id="srFace" cx="34%" cy="26%" r="86%">
                    <stop offset="0" stopColor="#3d4353" />
                    <stop offset=".52" stopColor="#232732" />
                    <stop offset="1" stopColor="#12141a" />
                  </radialGradient>
                  <linearGradient id="srBevel" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#b6bccd" />
                    <stop offset=".48" stopColor="#333846" />
                    <stop offset="1" stopColor="#787f94" />
                  </linearGradient>
                  <linearGradient id="srSpoke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#a7adc0" />
                    <stop offset=".4" stopColor="#565d70" />
                    <stop offset="1" stopColor="#23272f" />
                  </linearGradient>
                  <linearGradient id="srBoltG" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#b6bccd" />
                    <stop offset=".55" stopColor="#666d82" />
                    <stop offset="1" stopColor="#2c3039" />
                  </linearGradient>
                  <radialGradient id="srHub" cx="36%" cy="30%" r="80%">
                    <stop offset="0" stopColor="#4e5568" />
                    <stop offset="1" stopColor="#181b22" />
                  </radialGradient>
                </defs>

                {/* eight bolts, driven out of the collar as the wheel turns */}
                <g fill="url(#srBoltG)">
                  {BOLT_ANGLES.map((a, i) => (
                    <g key={a} transform={`rotate(${a} 230 230)`}>
                      <rect
                        ref={(el) => {
                          bolts.current[i] = el;
                        }}
                        x="221"
                        y="2"
                        width="18"
                        height="38"
                        rx="3"
                      />
                    </g>
                  ))}
                </g>

                <circle cx="230" cy="230" r="196" fill="url(#srCollar)" />
                <circle
                  cx="230"
                  cy="230"
                  r="195"
                  fill="none"
                  stroke="url(#srBevel)"
                  strokeWidth="2"
                />
                <circle
                  cx="230"
                  cy="230"
                  r="178"
                  fill="none"
                  stroke="#0c0e13"
                  strokeWidth="4"
                />
                <circle cx="230" cy="230" r="174" fill="url(#srFace)" />
                <circle
                  cx="230"
                  cy="230"
                  r="173"
                  fill="none"
                  stroke="url(#srBevel)"
                  strokeWidth="1.3"
                />
                {/* the knurled ring of index marks */}
                <circle
                  cx="230"
                  cy="230"
                  r="157"
                  fill="none"
                  stroke="#7c8398"
                  strokeWidth="9"
                  strokeDasharray="1.7 8.16"
                  opacity=".6"
                />
                <circle
                  cx="230"
                  cy="230"
                  r="142"
                  fill="none"
                  stroke="#12141a"
                  strokeWidth="5"
                />
                <circle
                  cx="230"
                  cy="230"
                  r="139"
                  fill="none"
                  stroke="url(#srBevel)"
                  strokeWidth="1.1"
                />
                {/* the index pointer, the one spot of colour on the steel */}
                <path d="M230 42 l-9 17 h18 z" fill="#9184d9" />

                <g ref={wheel} transform="rotate(0 230 230)">
                  <g fill="url(#srSpoke)">
                    {SPOKE_ANGLES.map((a) => (
                      <g key={a} transform={`rotate(${a} 230 230)`}>
                        <rect x="221" y="92" width="18" height="138" rx="9" />
                      </g>
                    ))}
                  </g>
                  <circle
                    cx="230"
                    cy="230"
                    r="54"
                    fill="url(#srHub)"
                    stroke="#868da2"
                    strokeWidth="1.6"
                  />
                  <circle
                    cx="230"
                    cy="230"
                    r="40"
                    fill="none"
                    stroke="#0f1116"
                    strokeWidth="2"
                  />
                  <g fill="#9aa1b4">
                    <circle cx="230" cy="200" r="3" />
                    <circle cx="258" cy="221" r="3" />
                    <circle cx="247" cy="254" r="3" />
                    <circle cx="213" cy="254" r="3" />
                    <circle cx="202" cy="221" r="3" />
                  </g>
                  <circle
                    cx="230"
                    cy="230"
                    r="18"
                    fill="#14161c"
                    stroke="#aeb4c8"
                    strokeWidth="1.4"
                  />
                  <circle ref={pin} cx="230" cy="230" r="6.5" fill={PIN_DARK} />
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div ref={hint} className={styles.hint}>
          Scroll to open ↓
        </div>
      </div>
    </section>
  );
}
