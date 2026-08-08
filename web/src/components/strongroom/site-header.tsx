"use client";

import { Mark } from "./mark";
import { useSealedNavigate } from "./vault-door";
import styles from "./site-header.module.css";

/** Sticks below the safe: the page only gets a header once the door is open. */
export function SiteHeader() {
  const sealedNavigate = useSealedNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Mark size={24} />
          <span className={styles.brandName}>Strongroom</span>
        </div>
        <nav className={styles.nav}>
          <a href="#story">The three failures</a>
          <a href="#demo">Try the lock</a>
          <a href="#plate">Mechanism</a>
          <button
            type="button"
            className={`btn btn-primary ${styles.navCta}`}
            onClick={() => sealedNavigate("/app")}
          >
            Open the vault
          </button>
        </nav>
      </div>
    </header>
  );
}
