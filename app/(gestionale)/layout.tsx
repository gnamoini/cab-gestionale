import { AppShell } from "@/components/gestionale/app-shell";

export default function GestionaleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
