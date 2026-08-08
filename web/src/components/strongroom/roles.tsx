import shell from "./section.module.css";
import styles from "./roles.module.css";

const ROLES = [
  {
    name: "Owner — you",
    powers: [
      "Deposit native coin and any ERC-20",
      "Request or cancel a withdrawal",
      "Heartbeat — free proof of life",
      "Veto a recovery you never needed",
      "Propose a config change (48 h)",
    ],
  },
  {
    name: "Guardians — N of them",
    powers: [
      "Approve or reject withdrawals",
      "Propose and approve a key rotation",
      "Veto a malicious config change",
      "Cannot move funds on their own",
      "Cannot block an inheritance, ever",
    ],
  },
  {
    name: "Heirs — by percentage",
    powers: [
      "See their share at any time",
      "Announce a claim after the silence",
      "Wait out the 48-hour notice",
      "Claim native and every tracked token",
      "Get nothing while you are alive",
    ],
  },
];

export function Roles() {
  return (
    <section className={shell.section}>
      <div className={shell.inner}>
        <p className={shell.kicker}>Who holds what</p>
        <h2 className={styles.heading}>Three roles. No administrator.</h2>
        <p className={shell.lede}>
          Powers are split so that no one of them — including you — can empty
          the vault alone, and no one of them can trap it either.
        </p>
        <div className={styles.grid}>
          {ROLES.map((r) => (
            <div key={r.name} className={styles.role}>
              <p className={styles.roleName}>{r.name}</p>
              <ul className={styles.powers}>
                {r.powers.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
