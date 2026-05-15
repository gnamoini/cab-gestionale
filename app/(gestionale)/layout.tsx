import { AppShell } from "@/components/gestionale/app-shell";
import { GestionaleAuthGate } from "@/components/gestionale/gestionale-auth-gate";
import { GestionaleSettingsReadyGate } from "@/components/gestionale/gestionale-settings-ready-gate";

export default function GestionaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <GestionaleAuthGate>
        <GestionaleSettingsReadyGate>{children}</GestionaleSettingsReadyGate>
      </GestionaleAuthGate>
    </AppShell>
  );
}
