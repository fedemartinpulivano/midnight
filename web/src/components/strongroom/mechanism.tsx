import shell from "./section.module.css";
import styles from "./mechanism.module.css";

const RULES = [
  {
    n: "01",
    title: "M-of-N guardians",
    body: "Any set, any threshold. A rejection kills a request only once the threshold is arithmetically out of reach, and the approval that crosses it executes the transfer in the same transaction.",
    code: "a request dies only when rejections > N − M",
  },
  {
    n: "02",
    title: "Weighted inheritance",
    body: "Shares are basis points that must total exactly 10 000 — nothing is left unassigned. Dividend accounting means a late deposit still splits correctly and a second claim pays only the delta.",
    code: "entitled = (balance + claimed) × bps ÷ 10 000",
  },
  {
    n: "03",
    title: "Social recovery",
    body: "Guardians rotate a lost key to your new address; the proposer's own approval already counts. The sitting owner's veto always wins during the timelock, so a rumour of loss can never become a theft.",
    code: "RECOVERY_DELAY = 48 h",
  },
  {
    n: "04",
    title: "Timelocked config",
    body: "Guardians, heirs and timers change in two phases. A stolen key cannot quietly swap your trust set out from under you.",
    code: "CONFIG_DELAY = 48 h · threshold vetoes cancel",
  },
  {
    n: "05",
    title: "One threshold, three powers",
    body: "The same number M governs withdrawals, key rotations and config vetoes. One dial sets how hard the vault is to open, to move and to change — there is nothing else to tune.",
    code: "executing a matured result is permissionless",
  },
  {
    n: "06",
    title: "Zero backend",
    body: "No servers, no database, no custody. The frontend reads Midnight directly — if this site disappears tonight, your vault does not.",
    code: "the contract is the only source of truth",
  },
];

export function Mechanism() {
  return (
    <section id="plate" className={shell.section}>
      <div className={shell.inner}>
        <p className={shell.kicker}>The mechanism</p>
        <h2 className={styles.heading}>Six rules, engraved on-chain.</h2>
        <div className={styles.grid}>
          {RULES.map((r) => (
            <div key={r.n} className={styles.rule}>
              <h4 className={styles.ruleTitle}>
                <span className={styles.ruleNum}>{r.n}</span>
                {r.title}
              </h4>
              <p className={styles.ruleBody}>{r.body}</p>
              <p className={styles.ruleCode}>{r.code}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
