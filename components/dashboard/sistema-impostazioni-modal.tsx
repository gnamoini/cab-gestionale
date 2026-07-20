"use client";

import Link from "next/link";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SistemaImpostazioniWorkspace } from "@/components/dashboard/settings/settings-workspace-shell";
import { OperatorGlobalSettingsPilotBadge } from "@/components/gestionale/operator-global-settings-pilot-badge";
import { ImpostazioniPageStructure } from "@/components/dashboard/impostazioni-page-structure";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { usePermissions } from "@/src/hooks/use-permissions";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

/**
 * @deprecated Nessun import attivo. Usare la pagina `/impostazioni` (`SistemaImpostazioniPageView`).
 */
export function SistemaImpostazioniModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <SistemaImpostazioniWorkspace open={open} onClose={onClose} surface="modal" />;
}

export function SistemaImpostazioniPageView() {
  const permissions = usePermissions();

  if (permissions.isLoading) {
    return <ImpostazioniPageStructure mode="skeleton" />;
  }

  if (!permissions.canManageSettings) {
    return (
      <div className={`${layoutPageRoot} min-w-0`}>
        <div className="mb-2 min-w-0">
          <OperatorGlobalSettingsPilotBadge />
        </div>
        <div className={dsStackPage}>
          <ShellCard title="Accesso negato">
            <p className="text-sm text-[color:var(--cab-text-muted)]">
              Non hai i permessi per modificare la configurazione globale. Questa pagina è disponibile solo per
              utenti autorizzati (admin, manager o operatore in ambiente pilot).
            </p>
            <Link href="/dashboard" className={`mt-4 inline-flex ${erpBtnNeutral}`}>
              Torna alla dashboard
            </Link>
          </ShellCard>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layoutPageRoot} min-w-0 ${dsStackPage}`}>
      <SistemaImpostazioniWorkspace surface="page" />
    </div>
  );
}
