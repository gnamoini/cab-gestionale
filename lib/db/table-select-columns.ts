/**
 * SSOT colonne PostgREST — evita select('*') e riduce payload.
 * Allineato a src/types/supabase-tables.ts e tipi dominio correlati.
 */

export const PROFILES_COLUMNS =
  "id, nome, username, ruolo, cliente_ref, created_at, updated_at" as const;

export const LAVORAZIONI_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice" as const;

/** Lista gestionale — senza `deleted_at` (filtro server); profili esclusi (lazy). */
export const LAVORAZIONI_LIST_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, codice" as const;

export const LAVORAZIONI_DETAIL_COLUMNS = LAVORAZIONI_COLUMNS;

/** Report / KPI — niente embed mezzo (join client da anagrafica). */
export const LAVORAZIONI_REPORT_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice" as const;

/** Colonne mezzo usate da liste lavorazioni / lookup leggeri. */
export const MEZZI_LIST_EMBED_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, entity_key" as const;

/** Embed mezzo minimo per tabella/kanban lista lavorazioni. */
export const MEZZI_EMBED_LIGHT_COLUMNS =
  "cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia" as const;

/** Lista mezzi — include `meta` (cantiere e telaio in tabella). */
export const MEZZI_LIST_LIGHT_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, meta, entity_key, created_at, updated_at" as const;

/** Report classifiche / KPI mezzi. */
export const MEZZI_REPORT_LIGHT_COLUMNS =
  "id, marca, modello, targa, matricola, numero_scuderia, cliente, tipo_attrezzatura" as const;

/** Report widget magazzino — subset KPI (meta per mapping UI). */
export const MAGAZZINO_REPORT_LIGHT_COLUMNS =
  "id, codice, nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at" as const;

export const MEZZI_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, meta, entity_key, created_at, updated_at" as const;

export const SCHEDA_LAVORAZIONE_COLUMNS =
  "id, lavorazione_id, tipo, contenuto, created_at, updated_at" as const;

export const MAGAZZINO_RICAMBI_COLUMNS =
  "id, codice, nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at" as const;

export const MOVIMENTI_RICAMBI_COLUMNS =
  "id, ricambio_id, lavorazione_id, tipo, quantita, created_at" as const;

export const PREVENTIVI_COLUMNS =
  "id, mezzo_id, lavorazione_id, cliente, totale, dettagli, created_at, updated_at" as const;

export const DOCUMENTI_COLUMNS =
  "id, mezzo_id, marca, modello, categoria, url_file, meta, created_at" as const;

export const LOG_MODIFICHE_COLUMNS =
  "id, entita, entita_id, azione, autore_id, payload, created_at" as const;

export const LOG_MODIFICHE_WITH_PROFILE_SELECT =
  `${LOG_MODIFICHE_COLUMNS}, profiles!log_modifiche_autore_id_fkey(id, nome)` as const;

export const APP_SETTINGS_COLUMNS = "id, module, key, value, updated_at, updated_by" as const;

export const APP_SETTINGS_AUDIT_COLUMNS =
  "id, module, key, old_value, new_value, updated_by, updated_at" as const;

export const USER_PERMISSIONS_COLUMNS =
  "user_id, module, can_read, can_write, can_admin" as const;

export const AUTH_LOGS_COLUMNS =
  "id, user_id, email, action, ip, user_agent, created_at" as const;

export const BUNDER_DOCUMENTS_COLUMNS =
  "id, kind, numero_progressivo, data_documento, azienda_destinatario, payload, created_by, last_edited_by, created_at, updated_at" as const;

export const DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS =
  "id, display_name, source_addetto_name, source_addetto_id, in_settings, created_at, updated_at" as const;

export const DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS =
  "id, dipendente_id, work_date, ore_ordinarie, ore_straordinarie, assenza, motivo_assenza, ore_assenza, note, tipo_assenza_id, tipo_assenza_label, employee_display_name_snapshot, employee_source_addetto_id_snapshot, updated_by, created_at, updated_at" as const;

export const REPORT_MANUAL_ENTRIES_COLUMNS =
  "id, period_month, completed_count, note, created_by, created_at, updated_at, deleted_at" as const;

export const LAVORAZIONE_DOCUMENTS_COLUMNS =
  "lavorazione_id, tipo, storage_path, filename, uploaded_at, uploaded_by" as const;

export const DASHBOARD_PROMEMORIA_COLUMNS =
  "id, created_at, updated_at, created_by, event_date, event_time, title, description, deleted_at, notified_on, entity_type, entity_id, series_id, recurrence_frequency, recurrence_interval, recurrence_until" as const;
