import styles from "./carcass.module.css";

/** The steel shell the whole site lives inside: a bevelled band on every edge
 *  with a rivet in each corner. Purely decorative — never takes pointer events. */
export function Carcass() {
  return (
    <>
      <div className={styles.frame} aria-hidden />
      <div className={styles.rivets} aria-hidden>
        <div className={styles.row}>
          <span className={styles.rivet} />
          <span className={styles.rivet} />
        </div>
        <div className={styles.row}>
          <span className={styles.rivet} />
          <span className={styles.rivet} />
        </div>
      </div>
    </>
  );
}
