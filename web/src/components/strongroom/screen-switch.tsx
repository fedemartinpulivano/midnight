"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSealedNavigate } from "./vault-door";
import styles from "./screen-switch.module.css";

/** Site ⇄ Vault, parked in the corner so it never crowds the navigation.
 *  Going in plays the door; coming back out is immediate. */
export function ScreenSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const sealedNavigate = useSealedNavigate();
  const onApp = pathname.startsWith("/app");

  return (
    <div className={styles.switch}>
      <button
        type="button"
        className={styles.opt}
        aria-current={onApp ? undefined : "page"}
        onClick={() => router.push("/")}
      >
        Site
      </button>
      <button
        type="button"
        className={styles.opt}
        aria-current={onApp ? "page" : undefined}
        onClick={() => sealedNavigate("/app")}
      >
        Vault
      </button>
    </div>
  );
}
