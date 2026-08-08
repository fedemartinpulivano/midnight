"use client";

import { useSealedNavigate } from "./vault-door";
import styles from "./closing-cta.module.css";

export function ClosingCta() {
  const sealedNavigate = useSealedNavigate();

  return (
    <>
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.heading}>
            Stop being the single point of failure.
          </h2>
          <p className={styles.body}>
            One transaction deploys the vault. Fund it, name your guardians and
            heirs, and walk away knowing nobody holds your keys — not them, not
            us.
          </p>
          <div className={styles.actions}>
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
              Star it on GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>Strongroom</span>
          <span>Midnight network</span>
        </div>
      </footer>
    </>
  );
}
