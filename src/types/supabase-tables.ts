/** Tipi allineati allo schema PostgreSQL / Supabase (snake_case). */

export type RuoloUtente =
  | "admin"
  | "manager"
  | "operatore"
  | "cliente"
  | "guest"
  | "ospite"
  | "magazziniere"
  | "commerciale";

/** @deprecated Usare `RuoloUtente`. */
export type RuoloProfile = RuoloUtente;

export type ProfileRow = {
  id: string;
  nome: string;
  /** Nome utente univoco per login (minuscolo, 3–32 caratteri). */
  username?: string | null;
  ruolo: RuoloUtente;
  /** Etichetta cliente (mezzi.cliente) per utenti ruolo=cliente. */
  cliente_ref?: string | null;
  created_at: string;
  updated_at: string;
};

/** Slug stato lavorazione (colonna TEXT — configurato in app_settings). */
export type StatoLavorazione = string;

/** Slug priorità lavorazione (colonna TEXT — configurato in app_settings). */
export type PrioritaLavorazione = string;

export type TipoSchedaLavorazione = "ingresso" | "interventi" | "ricambi";

export type TipoMovimentoRicambio = "entrata" | "uscita";

export type CategoriaDocumento = "listino" | "manuale" | "catalogo" | "certificazione" | "altro";

export type MezzoRow = {
  id: string;
  cliente: string;
  utilizzatore: string | null;
  marca: string;
  modello: string;
  targa: string | null;
  matricola: string | null;
  numero_scuderia: string | null;
  tipo_attrezzatura: string | null;
  anno: number | null;
  meta: Record<string, unknown> | null;
  /** Chiave normalizzata per dedupe/ricerca (Global Validation Layer). */
  entity_key?: string | null;
  created_at: string;
  updated_at: string;
};

export type LavorazioneRow = {
  id: string;
  mezzo_id: string;
  stato: StatoLavorazione;
  priorita: PrioritaLavorazione;
  data_ingresso: string | null;
  data_uscita: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Portale clienti: archiviata manualmente (indipendente dallo stato). */
  archived?: boolean;
  archived_at?: string | null;
  /** Eliminazione logica: esclusa da liste operative e statistiche. */
  deleted_at?: string | null;
  /** Codice umano display (es. 26-0001). Generato server-side. */
  codice?: string | null;
};

/** PDF allegato lavorazione (`lavorazione_documents`). */
export type LavorazioneDocumentTipo = "preventivo_upload" | "ddt";

export type LavorazioneDocumentRow = {
  lavorazione_id: string;
  tipo: LavorazioneDocumentTipo;
  storage_path: string;
  filename: string;
  uploaded_at: string;
  uploaded_by: string | null;
};

/** Tabella `scheda_lavorazione` (schede di lavorazione). */
export type SchedaLavorazioneRow = {
  id: string;
  lavorazione_id: string;
  tipo: TipoSchedaLavorazione;
  contenuto: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MagazzinoRicambioRow = {
  id: string;
  codice: string;
  nome: string;
  marca: string | null;
  quantita: number;
  costo: number | null;
  prezzo_vendita: number | null;
  consumo_medio_mensile: number | null;
  meta: Record<string, unknown>;
  /** Chiave normalizzata per dedupe/ricerca (Global Validation Layer). */
  entity_key?: string | null;
  created_at: string;
  updated_at: string;
};

export type MovimentoRicambioRow = {
  id: string;
  ricambio_id: string;
  lavorazione_id: string | null;
  tipo: TipoMovimentoRicambio;
  quantita: number;
  created_at: string;
};

/** Registry snapshot dipendenti timesheet. */
export type DipendenteTimesheetEmployeeRow = {
  id: string;
  display_name: string;
  source_addetto_name: string | null;
  source_addetto_id: string | null;
  in_settings: boolean;
  created_at: string;
  updated_at: string;
};

/** Entry giornaliera timesheet dipendente. */
export type DipendenteTimesheetEntryRow = {
  id: string;
  dipendente_id: string;
  work_date: string;
  ore_ordinarie: number;
  ore_straordinarie: number;
  assenza: boolean;
  motivo_assenza: string | null;
  ore_assenza: number;
  note: string | null;
  tipo_assenza_id: string | null;
  tipo_assenza_label: string | null;
  employee_display_name_snapshot: string;
  employee_source_addetto_id_snapshot: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Dati storici manuali Report lavorazioni (`report_manual_entries`). */
export type ReportManualEntryRow = {
  id: string;
  period_month: string;
  completed_count: number;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type PreventivoRow = {
  id: string;
  mezzo_id: string;
  lavorazione_id: string | null;
  cliente: string;
  totale: number;
  dettagli: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentoRow = {
  id: string;
  mezzo_id: string | null;
  marca: string;
  modello: string | null;
  categoria: CategoriaDocumento;
  url_file: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type LogModificaRow = {
  id: string;
  entita: string;
  entita_id: string;
  azione: string;
  autore_id: string | null;
  payload: unknown;
  created_at: string;
};

/** `log_modifiche` con join autore (`profiles`). */
export type LogModificaWithProfileRow = LogModificaRow & {
  profiles: { id: string; nome: string } | null;
};

/** Tabella `app_settings` — configurazione globale (JSON per modulo/chiave). */
export type AppSettingRow = {
  id: string;
  module: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

/** Tabella `app_settings_audit` — storico UPDATE su `app_settings` (solo admin in lettura). */
export type AppSettingsAuditRow = {
  id: string;
  module: string;
  key: string;
  old_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
};

/** Tabella `user_permissions` — permessi granulari per modulo. */
export type UserPermissionRow = {
  user_id: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
};

/** Tabella `auth_logs` — eventi autenticazione. */
export type AuthLogAction = "login" | "logout" | "login_failed";

export type AuthLogRow = {
  id: string;
  user_id: string | null;
  email: string;
  action: AuthLogAction;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

/** Riga `auth_logs` con join `profiles` (select PostgREST). */
export type AuthLogWithProfileRow = AuthLogRow & {
  profiles: { id: string; nome: string } | null;
};

/** Documenti commerciali BUNDER (`bunder_documents`). */
export type BunderDocumentRow = {
  id: string;
  kind: string;
  numero_progressivo: string;
  data_documento: string;
  azienda_destinatario: string;
  payload: Record<string, unknown>;
  created_by: string;
  last_edited_by: string;
  created_at: string;
  updated_at: string;
};
