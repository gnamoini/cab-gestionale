"use client";

import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
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
  /** @deprecated Lista condivisa via lavorazioniQueries — non invalidare separatamente. */
  clientLavorazioniList: ["client_lavorazioni_list"] as const,
  clientLavorazioniDetail: ["client_lavorazioni_detail"] as const,
  clientLavorazioneDocuments: ["client_lavorazione_documents"] as const,
  clientLavorazionePhotos: ["client_lavorazione_photos"] as const,
  /** Log eventi autenticazione (`auth_logs`). */
  authLogs: ["auth_logs"] as const,
  /** Note condivise (modulo Supporto). */
  supportNotes: ["support_notes"] as const,
  /** @deprecated Usare `supportNotes` — tabella legacy `segnalazioni`. */
  segnalazioni: ["segnalazioni"] as const,
};

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  dispatchGestionaleLocalMutation(qc, ["mezzi", "lavorazioni", "preventivi", "documenti", "log_modifiche"]);
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient) {
  await qc.invalidateQueries({ queryKey: QK.mezzoQueries, refetchType: "active" });
  dispatchGestionaleLocalMutation(qc, [
    "lavorazioni",
    "scheda_lavorazione",
    "documenti",
    "movimenti_ricambi",
    "preventivi",
  ]);
  bumpReportDataRefresh();
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient) {
  dispatchGestionaleLocalMutation(qc, ["magazzino_ricambi", "movimenti_ricambi", "lavorazioni"]);
}
