/** Messaggi standard per il loading globale (breve, contestuale). */
export const GLOBAL_LOADING_MESSAGES = {
  default: "Caricamento…",
  session: "Caricamento sessione…",
  settings: "Caricamento impostazioni…",
  page: "Caricamento pagina…",
  navigation: "Caricamento in corso…",
  login: "Accesso in corso…",
  logout: "Uscita in corso…",
  redirectLogin: "Reindirizzamento al login…",
  redirectDashboard: "Reindirizzamento alla dashboard…",
  redirectWorkspace: "Reindirizzamento alla tua area di lavoro…",
  saving: "Salvataggio modifiche…",
  syncing: "Sincronizzazione dati…",
  dashboard: "Aggiornamento dashboard…",
} as const;

export type GlobalLoadingMessageKey = keyof typeof GLOBAL_LOADING_MESSAGES;
