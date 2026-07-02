/** @deprecated Evento legacy localStorage; preferire invalidazione React Query su `app_settings`. */
export const CAB_LAVORAZIONI_PREFS_REFRESH = "cab-lavorazioni-prefs-refresh";

/** Evento: ricarica anagrafiche magazzino (marche, categorie, …) da localStorage. */
export const CAB_MAGAZZINO_MASTER_REFRESH = "cab-magazzino-master-refresh";

/** Evento: ricarica elenchi mezzi (clienti, marche, tipi, stati) da localStorage. */
export const CAB_MEZZI_LISTE_REFRESH = "cab-mezzi-liste-refresh";

/** Rinomina addetto su record lavorazioni (attive + storico) quando la vista è montata. */
export const CAB_ADDETTO_DISPLAY_RENAME = "cab-addetto-display-rename";

export type CabAddettoRenameDetail = { previousName: string; nextName: string };

export function dispatchAddettoDisplayRename(detail: CabAddettoRenameDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CabAddettoRenameDetail>(CAB_ADDETTO_DISPLAY_RENAME, { detail }));
}

/** Log modifiche dashboard (widget dashboard): aggiorna pannello se aperto. */
export const CAB_DASHBOARD_SISTEMA_LOG_REFRESH = "cab-dashboard-sistema-log-refresh";

export function dispatchDashboardSistemaLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_DASHBOARD_SISTEMA_LOG_REFRESH));
}

/** Log modifiche configurazione globale (/impostazioni). */
export const CAB_CONFIGURAZIONE_LOG_REFRESH = "cab-configurazione-log-refresh";

export function dispatchConfigurazioneLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_CONFIGURAZIONE_LOG_REFRESH));
}

/** Stack undo salvataggi configurazione (/impostazioni). */
export const CAB_CONFIGURAZIONE_UNDO_REFRESH = "cab-configurazione-undo-refresh";

export function dispatchConfigurazioneUndoRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_CONFIGURAZIONE_UNDO_REFRESH));
}

export const CAB_PREVENTIVI_LOG_REFRESH = "cab-preventivi-log-refresh";

export function dispatchPreventiviLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_PREVENTIVI_LOG_REFRESH));
}

export const CAB_DOCUMENTI_LOG_REFRESH = "cab-documenti-log-refresh";

export function dispatchDocumentiLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_DOCUMENTI_LOG_REFRESH));
}
