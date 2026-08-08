"use client";

import { useRef } from "react";
import { useScrollDriver } from "@/lib/use-scroll-driver";
import styles from "./story.module.css";

const ACCENT = "#9184d9";
const DIM = "#333748";
const LEGEND_ON = "#d2cefd";
const LEGEND_OFF = "#575c73";

const STEPS = [
  {
    kicker: "Bolt 01 — Guardians",
    title: "Someone takes your key.",
    body: [
      "The thief signs, and nothing opens. Every withdrawal waits for M of N guardians — a stolen key can propose, never execute.",
      "It cannot quietly replace those guardians either: every config change sits 48 hours in the open, where they kill it.",
    ],
    rule: "the key alone signs nothing",
    legend: "Guardians",
  },
  {
    kicker: "Bolt 02 — Timelock",
    title: "You drop it down a drain.",
    body: [
      "Guardians vote to rotate ownership onto a fresh address, behind a 48-hour timelock you can veto at any moment.",
      "If you can still veto, the key was never lost. That single sentence is the whole design.",
    ],
    rule: "funds stay put; only the key moves",
    legend: "Timelock",
  },
  {
    kicker: "Bolt 03 — Silence",
    title: "Or nobody hears from you again.",
    body: [
      "After your inactivity period an heir serves notice; 48 hours later they claim exactly their percentage, native coin and every tracked token.",
      "Any sign of life voids the notice for free. There is no cancel button — only a subtraction of timestamps.",
    ],
    rule: "being unreachable for a month costs you nothing",
    legend: "Silence",
  },
];

/** Bolt seated in its housing vs. thrown clear of it. */
const BOLT_SEATED = "M210 44 V80";
const BOLT_THROWN = "M210 10 V46";

export function Story() {
  const steps = useRef<(HTMLDivElement | null)[]>([]);
  const copies = useRef<(HTMLDivElement | null)[]>([]);
  const boltPaths = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const count = useRef<SVGTextElement>(null);

  useScrollDriver(() => {
    // Whichever step straddles the middle of the viewport is the live one.
    const mid = window.innerHeight / 2;
    let step = -1;
    steps.current.forEach((n, i) => {
      if (!n) return;
      const r = n.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) step = i;
    });

    for (let i = 0; i < STEPS.length; i++) {
      const on = step >= i;
      const col = on ? ACCENT : DIM;

      const copy = copies.current[i];
      if (copy) {
        copy.style.opacity =
          step === i || (step < 0 && i === 0) ? "1" : "0.32";
      }
      const path = boltPaths.current[i];
      if (path) {
        path.setAttribute("d", on ? BOLT_THROWN : BOLT_SEATED);
        path.setAttribute("stroke", col);
      }
      const dot = dots.current[i];
      if (dot) {
        dot.style.background = col;
        dot.style.boxShadow = `0 0 9px ${col}`;
      }
      const label = labels.current[i];
      if (label) label.style.color = on ? LEGEND_ON : LEGEND_OFF;
    }

    if (count.current) {
      count.current.textContent = `${Math.max(0, Math.min(3, step + 1))}/3`;
      count.current.setAttribute("fill", step >= 2 ? ACCENT : "#b2b6ca");
    }
  });

  return (
    <section id="story">
      <div className={styles.grid}>
        <div>
          {STEPS.map((s, i) => (
            <div
              key={s.kicker}
              ref={(el) => {
                steps.current[i] = el;
              }}
              className={styles.step}
            >
              <div
                ref={(el) => {
                  copies.current[i] = el;
                }}
                className={styles.stepInner}
                style={i === 0 ? { opacity: 1 } : undefined}
              >
                <p className={styles.kicker}>{s.kicker}</p>
                <h2 className={styles.title}>{s.title}</h2>
                {s.body.map((line, j) => (
                  <p
                    key={j}
                    className={`${styles.body} ${j === s.body.length - 1 ? styles.bodyLast : ""}`}
                  >
                    {line}
                  </p>
                ))}
                <p className={styles.rule}>{s.rule}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.pinCol}>
          <div className={styles.pinned}>
            <svg viewBox="0 0 420 420" className={styles.doorSvg}>
              <defs>
                <linearGradient id="sdCollar" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6a7186" />
                  <stop offset=".45" stopColor="#2c313d" />
                  <stop offset="1" stopColor="#171a21" />
                </linearGradient>
                <radialGradient id="sdFace" cx="34%" cy="26%" r="86%">
                  <stop offset="0" stopColor="#3d4353" />
                  <stop offset=".52" stopColor="#232732" />
                  <stop offset="1" stopColor="#12141a" />
                </radialGradient>
                <linearGradient id="sdBevel" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#b6bccd" />
                  <stop offset=".48" stopColor="#333846" />
                  <stop offset="1" stopColor="#787f94" />
                </linearGradient>
                <radialGradient id="sdHub" cx="36%" cy="30%" r="80%">
                  <stop offset="0" stopColor="#4e5568" />
                  <stop offset="1" stopColor="#181b22" />
                </radialGradient>
              </defs>

              <g strokeLinecap="round" strokeWidth="17">
                {[0, 120, 240].map((a, i) => (
                  <g key={a} transform={`rotate(${a} 210 210)`}>
                    <path
                      ref={(el) => {
                        boltPaths.current[i] = el;
                      }}
                      d={BOLT_SEATED}
                      stroke={DIM}
                      className={styles.bolt}
                    />
                  </g>
                ))}
              </g>

              <circle cx="210" cy="210" r="172" fill="url(#sdCollar)" />
              <circle
                cx="210"
                cy="210"
                r="171"
                fill="none"
                stroke="url(#sdBevel)"
                strokeWidth="2"
              />
              <circle
                cx="210"
                cy="210"
                r="155"
                fill="none"
                stroke="#0c0e13"
                strokeWidth="4"
              />
              <circle cx="210" cy="210" r="151" fill="url(#sdFace)" />
              <circle
                cx="210"
                cy="210"
                r="150"
                fill="none"
                stroke="url(#sdBevel)"
                strokeWidth="1.3"
              />
              <circle
                cx="210"
                cy="210"
                r="136"
                fill="none"
                stroke="#7c8398"
                strokeWidth="8"
                strokeDasharray="1.6 6.94"
                opacity=".55"
              />
              <circle
                cx="210"
                cy="210"
                r="122"
                fill="none"
                stroke="#12141a"
                strokeWidth="5"
              />
              <circle
                cx="210"
                cy="210"
                r="119"
                fill="none"
                stroke="url(#sdBevel)"
                strokeWidth="1.1"
              />
              <circle
                cx="210"
                cy="210"
                r="62"
                fill="url(#sdHub)"
                stroke="#868da2"
                strokeWidth="1.6"
              />
              <circle
                cx="210"
                cy="210"
                r="48"
                fill="none"
                stroke="#0f1116"
                strokeWidth="2"
              />
              <text
                ref={count}
                x="210"
                y="222"
                textAnchor="middle"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="32"
                fill="#b2b6ca"
                className={styles.count}
              >
                0/3
              </text>
            </svg>

            <div className={styles.legend}>
              {STEPS.map((s, i) => (
                <div
                  key={s.legend}
                  ref={(el) => {
                    labels.current[i] = el;
                  }}
                  className={styles.legendRow}
                >
                  <span
                    ref={(el) => {
                      dots.current[i] = el;
                    }}
                    className={styles.legendDot}
                  />
                  {s.legend}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
