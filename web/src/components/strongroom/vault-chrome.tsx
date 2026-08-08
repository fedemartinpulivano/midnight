import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "@/app/vault.css";

/* The steel shell the vault screens live inside, and the type that goes with
   it. Loaded on the routes that use it rather than in the root layout, so the
   rest of the app keeps its own faces and palette. */

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export function VaultChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className={`vault ${archivo.variable} ${plexMono.variable}`}>
      <div className="vault-carcass" aria-hidden />
      <div className="vault-rivets" aria-hidden>
        <div>
          <span className="vault-rivet" />
          <span className="vault-rivet" />
        </div>
        <div>
          <span className="vault-rivet" />
          <span className="vault-rivet" />
        </div>
      </div>
      {children}
    </div>
  );
}
