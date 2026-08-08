import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { SafeHero } from "@/components/strongroom/safe-hero";
import { SiteHeader } from "@/components/strongroom/site-header";
import { Story } from "@/components/strongroom/story";
import { LockDemo } from "@/components/strongroom/lock-demo";
import { Mechanism } from "@/components/strongroom/mechanism";
import { Roles } from "@/components/strongroom/roles";
import { ClosingCta } from "@/components/strongroom/closing-cta";
import { Carcass } from "@/components/strongroom/carcass";
import { ScreenSwitch } from "@/components/strongroom/screen-switch";
import { VaultDoorProvider } from "@/components/strongroom/vault-door";
import "./strongroom.css";

/* Archivo carries the whole identity across both of its axes — condensed for
   headlines, expanded for the mark and the engraved plates — so the wdth axis
   has to be requested explicitly. Loaded here rather than in the root layout
   so /app keeps its own faces untouched. */
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

export default function Landing() {
  return (
    <div className={`strongroom ${archivo.variable} ${plexMono.variable}`}>
      <VaultDoorProvider>
        <Carcass />
        <ScreenSwitch />
        <SafeHero />
        <SiteHeader />
        <Story />
        <LockDemo threshold={2} />
        <Mechanism />
        <Roles />
        <ClosingCta />
      </VaultDoorProvider>
    </div>
  );
}
