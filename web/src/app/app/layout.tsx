import { VaultChrome } from "@/components/strongroom/vault-chrome";

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VaultChrome>{children}</VaultChrome>;
}
