"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./vault-door.module.css";

/** Milliseconds the leaves stay shut before the next screen is pushed. */
const SHUT_AT = 520;
/** Milliseconds until the overlay is torn down again. */
const CLEAR_AT = 1200;

type Phase = "idle" | "arming" | "shut" | "opening";

const VaultDoorContext = createContext<(href: string) => void>(() => {});

/** Navigate with the vault-door transition: leaves close, wheel turns, route
 *  changes behind them, leaves open onto the new screen. */
export function useSealedNavigate() {
  return useContext(VaultDoorContext);
}

export function VaultDoorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const sealedNavigate = useCallback(
    (href: string) => {
      if (phase !== "idle" || href === pathname) return;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        router.push(href);
        return;
      }

      // The leaves must be painted in their open position for one frame before
      // they are told to shut, or the browser has no start value to animate
      // from and they simply appear closed.
      setPhase("arming");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPhase("shut")),
      );

      timers.current.push(
        setTimeout(() => {
          router.push(href);
          setPhase("opening");
        }, SHUT_AT),
        setTimeout(() => setPhase("idle"), CLEAR_AT),
      );
    },
    [phase, pathname, router],
  );

  return (
    <VaultDoorContext.Provider value={sealedNavigate}>
      {children}
      <div
        className={`${styles.overlay} ${phase === "shut" ? styles.shut : ""}`}
        style={{ display: phase === "idle" ? "none" : "block" }}
        aria-hidden
      >
        <div className={`${styles.leaf} ${styles.leafLeft}`} />
        <div className={`${styles.leaf} ${styles.leafRight}`} />
        <div className={styles.wheelWrap}>
          <svg
            className={styles.wheel}
            width="92"
            height="92"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="#3d4353"
              strokeWidth="1.6"
            />
            <g stroke="#c9cede" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 3 V21" />
              <path d="M3 12 H21" />
            </g>
            <circle
              cx="12"
              cy="12"
              r="2.4"
              fill="#0e1015"
              stroke="#c9cede"
              strokeWidth="1.4"
            />
            <circle cx="12" cy="12" r="1" fill="#9184d9" />
          </svg>
        </div>
      </div>
    </VaultDoorContext.Provider>
  );
}
