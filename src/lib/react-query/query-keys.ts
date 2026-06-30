/** Query keys React Query — modulo pure (zero import runtime). */

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
  fatturazione: ["fatturazione"] as const,
  ddt: ["ddt"] as const,
  ordiniFornitori: ["ordini_fornitori"] as const,
  documenti: ["documenti"] as const,
  log: ["log_modifiche"] as const,
  settings: ["app_settings"] as const,
  /** Storico modifiche `app_settings` (solo admin). */
  settingsAudit: ["app_settings_audit"] as const,
  /** Permessi granulari `user_permissions` (per sessione utente). */
  userPermissions: ["user_permissions"] as const,
  /** Portale lavorazioni clienti — accesso sessione. */
  clientLavorazioniAccess: ["client_lavorazioni_access"] as const,
  clientLavorazioniDetail: ["client_lavorazioni_detail"] as const,
  clientLavorazioneDocuments: ["client_lavorazione_documents"] as const,
  clientLavorazionePhotos: ["client_lavorazione_photos"] as const,
  /** Log eventi autenticazione (`auth_logs`). */
  authLogs: ["auth_logs"] as const,
  /** Dati storici manuali Report lavorazioni. */
  reportManualEntries: ["report_manual_entries"] as const,
  /** Registry dipendenti timesheet. */
  dipendentiTimesheetEmployees: ["dipendenti_timesheet_employees"] as const,
  /** Dipendente IDs con almeno una entry timesheet (storico). */
  dipendentiTimesheetEmployeeIdsWithEntries: ["dipendenti_timesheet_employee_ids_with_entries"] as const,
  /** Entries timesheet per mese. */
  dipendentiTimesheetEntries: ["dipendenti_timesheet_entries"] as const,
  dipendentiTimesheetMonthKeysWithData: ["dipendenti_timesheet_month_keys_with_data"] as const,
  /** Documenti commerciali BUNDER. */
  bunder: ["bunder_documents"] as const,
};

/** Bundle schede per lavorazione — unica cache React Query (derivata da DB). */
export const SCHEde_BUNDLES_QUERY_KEY = [...QK.schede, "bundles"] as const;

/** @deprecated Usare `SCHEde_BUNDLES_QUERY_KEY`. */
export const SCHEDE_STORE_QUERY_KEY = SCHEde_BUNDLES_QUERY_KEY;
