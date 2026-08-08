import { VaultChrome } from "@/components/strongroom/vault-chrome";

/* The mocked design preview wears the same shell as the live panel, so what it
   shows is what /app shows once a wallet is connected. */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VaultChrome>{children}</VaultChrome>;
}
