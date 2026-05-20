"use client";

import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import type { QueryClient } from "@tanstack/react-query";

export const QK = {
  profiles: ["profiles"] as const,
  /** Profili lista utenti (pagina Sicurezza / creazione utenti). */
  authUsers: ["profiles", "auth-users-list"] as const,
  securityUsers: ["security-users"] as const,
  /** Utenti + permessi portale clienti (pagina Sicurezza unificata). */
  securityUsersPermissions: ["security-users-permissions"] as const,
  mezzi: ["mezzi"] as const,
  mezzoQueries: ["mezzoQueries"] as const,
  lavorazioniQueries: ["lavorazioniQueries"] as const,
  schede: ["schede"] as const,
  magazzino: ["magazzino"] as const,
  movimenti: ["movimenti"] as const,
  preventivi: ["preventivi"] as const,
  documenti: ["documenti"] as const,
  log: ["log_modifiche"] as const,
  settings: ["app_settings"] as const,
  /** Storico modifiche `app_settings` (solo admin). */
  settingsAudit: ["app_settings_audit"] as const,
  /** Permessi granulari `user_permissions` (per sessione utente). */
  userPermissions: ["user_permissions"] as const,
  /** Portale lavorazioni clienti — accesso sessione. */
  clientLavorazioniAccess: ["client_lavorazioni_access"] as const,
  clientLavorazioniList: ["client_lavorazioni_list"] as const,
  clientLavorazioniDetail: ["client_lavorazioni_detail"] as const,
  /** Log eventi autenticazione (`auth_logs`). */
  authLogs: ["auth_logs"] as const,
  /** Segnalazioni condivise (modulo Supporto). */
  segnalazioni: ["segnalazioni"] as const,
};

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzi }),
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.preventivi }),
    qc.invalidateQueries({ queryKey: QK.documenti }),
    qc.invalidateQueries({ queryKey: QK.log }),
  ]);
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioniList }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail }),
    qc.invalidateQueries({ queryKey: QK.schede }),
    qc.invalidateQueries({ queryKey: QK.movimenti }),
    qc.invalidateQueries({ queryKey: QK.preventivi }),
    qc.invalidateQueries({ queryKey: QK.documenti }),
    qc.invalidateQueries({ queryKey: QK.log }),
  ]);
  bumpReportDataRefresh();
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.magazzino }),
    qc.invalidateQueries({ queryKey: QK.movimenti }),
  ]);
}
