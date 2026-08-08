"use client";

import { useState } from "react";
import shell from "./section.module.css";
import styles from "./lock-demo.module.css";

const GUARDIANS = ["0x7099…79C8", "0x3C44…93BC", "0x90F7…b906"];

/** The live M-of-N lock. `threshold` is the contract's M — the same dial that
 *  governs withdrawals, rotations and config vetoes. */
export function LockDemo({ threshold = 2 }: { threshold?: number }) {
  const [thrown, setThrown] = useState([false, false, false]);

  const count = thrown.filter(Boolean).length;
  const executed = count >= threshold;

  const toggle = (i: number) =>
    setThrown((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <section id="demo" className={shell.section}>
      <div className={shell.inner}>
        <p className={shell.kicker}>Try the lock</p>
        <h2 className={styles.heading}>Throw two of three and it opens.</h2>
        <p className={`${shell.lede} ${styles.lede}`}>
          Not a metaphor — the contract&rsquo;s actual rule. A request executes
          the instant the threshold is met, and dies only when rejections make
          that threshold arithmetically impossible.
        </p>

        <div className={styles.lock}>
          <div className={styles.guardians}>
            {GUARDIANS.map((addr, i) => (
              <button
                key={addr}
                type="button"
                className={styles.guardian}
                aria-pressed={thrown[i]}
                onClick={() => toggle(i)}
              >
                <div className={styles.addr}>{addr}</div>
                <div className={styles.socket}>
                  <div className={styles.bolt} />
                </div>
                <div className={styles.state}>
                  {thrown[i] ? "Bolt thrown" : "Click to approve"}
                </div>
              </button>
            ))}
          </div>

          <div
            className={`${styles.bar} ${executed ? styles.barExecuted : ""}`}
          >
            <div>
              <div className={styles.request}>
                Request #04 · 1.25 NIGHT → 0x15d3…6A65
              </div>
              <div className={styles.status}>
                {executed
                  ? "Executed — funds released"
                  : count === 0
                    ? "Sealed — waiting on guardians"
                    : "Threshold not reached"}
              </div>
            </div>
            <div className={styles.tally}>
              {count} / {threshold}
            </div>
          </div>
        </div>

        <p className={styles.footnote}>
          Click a guardian to throw or withdraw their bolt.
        </p>
      </div>
    </section>
  );
}
