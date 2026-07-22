/**
 * SSOT colonne PostgREST — evita select('*') e riduce payload.
 * Allineato a src/types/supabase-tables.ts e tipi dominio correlati.
 */

export const PROFILES_COLUMNS =
  "id, nome, cognome, username, role_key, cliente_ref, created_at, updated_at" as const;

export const LAVORAZIONI_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice, target_type, attrezzatura_id" as const;

/** Lista gestionale — senza `deleted_at` (filtro server); profili esclusi (lazy). */
export const LAVORAZIONI_LIST_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, codice, target_type, attrezzatura_id" as const;

export const LAVORAZIONI_DETAIL_COLUMNS = LAVORAZIONI_COLUMNS;

/** Report / KPI — niente embed mezzo (join client da anagrafica). */
export const LAVORAZIONI_REPORT_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice" as const;

/** Colonne mezzo usate da liste lavorazioni / lookup leggeri (telaio + ident; attrezzatura via join). */
export const MEZZI_LIST_EMBED_COLUMNS =
  "id, cliente, utilizzatore, targa, numero_scuderia, anno, entity_key, marca_telaio, modello_telaio, tipo_telaio" as const;

/** Embed mezzo minimo per tabella/kanban lista lavorazioni. */
export const MEZZI_EMBED_LIGHT_COLUMNS =
  "cliente, utilizzatore, targa, numero_scuderia, marca_telaio, modello_telaio" as const;

/** Portale clienti — light + meta (cantiere in `mezzi.meta`). */
export const MEZZI_EMBED_CLIENT_PORTAL_COLUMNS =
  `${MEZZI_EMBED_LIGHT_COLUMNS},meta` as const;

/** Lista mezzi — telaio + ident (attrezzatura via tabella dedicata). */
export const MEZZI_LIST_LIGHT_COLUMNS =
  "id, cliente, utilizzatore, targa, numero_scuderia, anno, meta, entity_key, created_at, updated_at, marca_telaio, modello_telaio, tipo_telaio, telaio_num, km, note" as const;

/** Report classifiche / KPI mezzi. */
export const MEZZI_REPORT_LIGHT_COLUMNS =
  "id, targa, matricola, numero_scuderia, cliente, marca_telaio, modello_telaio, tipo_telaio" as const;

/** Report widget magazzino — subset KPI (meta per mapping UI). */
export const MAGAZZINO_REPORT_LIGHT_COLUMNS =
  "id, codice, nome, marca, quantita, stock_version, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at" as const;

export const MEZZI_COLUMNS =
  "id, cliente, utilizzatore, targa, numero_scuderia, anno, meta, entity_key, marca_telaio, modello_telaio, tipo_telaio, telaio_num, km, note, created_at, updated_at" as const;

export const ATTREZZATURE_COLUMNS =
  "id, mezzo_id, marca, modello, tipo_attrezzatura, matricola, portata, anno, note, created_at, updated_at, created_by" as const;

export const ATTREZZATURE_EMBED_LIGHT_COLUMNS =
  "id, mezzo_id, marca, modello, tipo_attrezzatura, matricola" as const;

export const ASSET_COMPLIANCE_RULES_COLUMNS =
  "id, asset_kind, mezzo_id, attrezzatura_id, rule_kind, trigger_kind, interval_months, fixed_month, fixed_day, km_interval, last_completed_at, next_due_at, next_due_km, alert_days_before, is_active, note, created_at, updated_at, created_by" as const;

export const ASSET_COMPLIANCE_RECORDS_COLUMNS =
  "id, rule_id, asset_kind, mezzo_id, attrezzatura_id, rule_kind, completed_at, km_at_completion, document_ref, esito, note, created_at, created_by" as const;

export const ASSET_ASSIGNMENT_HISTORY_COLUMNS =
  "id, attrezzatura_id, mezzo_id, valid_from, valid_to, change_reason, note, created_at, created_by" as const;

export const ASSET_MILEAGE_READINGS_COLUMNS =
  "id, mezzo_id, recorded_at, km, source, lavorazione_id, created_by, note, created_at" as const;

export const TIPI_ATTREZZATURA_CATALOG_COLUMNS =
  "id, label, label_norm, created_at, updated_at" as const;

export const MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS =
  "id, plan_id, tipo_attrezzatura_id, created_at" as const;

export const MAINTENANCE_PLAN_PARTS_COLUMNS =
  "id, plan_id, ricambio_id, quantita, created_at, updated_at, is_required, replacement_condition, condition_params, sort_order, note, preset_version_id" as const;

export const MAINTENANCE_PLANS_COLUMNS =
  "id, nome, interval_ore, is_active, created_at, updated_at, created_by, deleted_at, description, category_id, manufacturer_id, model_id, parent_preset_id, override_scope, interval_type, interval_value, current_version_id, sort_order, maintenance_kind, status, tempo_previsto_minuti, manodopera_costo_orario" as const;

export const VEHICLE_MAINTENANCE_SERVICES_COLUMNS =
  "id, mezzo_id, plan_id, performed_at, ore_at_service, mezzo_ore_snapshot, note, performed_by, created_at, updated_at, created_by, execution_type, preset_snapshot, km_at_service" as const;

export const VEHICLE_MAINTENANCE_SERVICE_PARTS_COLUMNS =
  "id, service_id, ricambio_id, quantita, descrizione_snapshot, created_at, was_replaced, was_due, replacement_condition, is_required_snapshot, note, warehouse_status" as const;

export const VEHICLE_MAINTENANCE_CONFIGS_COLUMNS =
  "id, mezzo_id, preset_id, preset_version_id, maintenance_kind, is_active, interval_type, interval_value, label, activated_at, deactivated_at, planned_lavorazione_id, created_at, updated_at, created_by, deleted_at" as const;

export const VEHICLE_MAINTENANCE_FORECASTS_COLUMNS =
  "config_id, computed_at, next_date_estimated, next_milestone_value, remaining_value, confidence_level, confidence_pct, confidence_reason, ema_rate_per_day, observation_count, variance, stddev, engine_version, trigger_reason, explainability_json" as const;

export const MAINTENANCE_PRESET_VERSIONS_COLUMNS =
  "id, preset_id, version_number, snapshot_json, manual_name, manufacturer_ref, revision, page_ref, document_id, change_note, created_at, created_by" as const;

export const MAINTENANCE_PRESET_CATEGORIES_COLUMNS =
  "id, label, sort_order, is_active, created_at, updated_at" as const;

export const MAINTENANCE_PLANS_V2_COLUMNS = MAINTENANCE_PLANS_COLUMNS;

export const MAINTENANCE_PLAN_PARTS_V2_COLUMNS = MAINTENANCE_PLAN_PARTS_COLUMNS;

export const MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS =
  "id, preset_id, operator, sort_order, label, created_at, updated_at" as const;

export const MAINTENANCE_PRESET_TRIGGERS_COLUMNS =
  "id, group_id, trigger_type, threshold, priority, created_at" as const;

export const MAINTENANCE_PRESET_CHECKLIST_COLUMNS =
  "id, preset_id, label, sort_order, is_required, created_at" as const;

export const VEHICLE_MAINTENANCE_SERVICE_CHECKLIST_COLUMNS =
  "id, service_id, item_label, checked, note, sort_order, created_at" as const;

export const VEHICLE_MAINTENANCE_SERVICES_V2_COLUMNS =
  "id, mezzo_id, plan_id, performed_at, ore_at_service, mezzo_ore_snapshot, note, performed_by, created_at, updated_at, created_by, config_id, preset_version_id, interval_type, interval_value_at_execution, km_at_service, milestone_reached, lavorazione_id, scheda_lavorazione_id, anomaly_note, confidence_at_execution, total_cost, execution_type, preset_snapshot" as const;

export const ASSET_TIMELINE_PROJECTION_COLUMNS =
  "event_category, event_domain, source_id, asset_kind, mezzo_id, attrezzatura_id, event_at, event_subtype, priority, label" as const;

export const SCHEDA_LAVORAZIONE_COLUMNS =
  "id, lavorazione_id, tipo, contenuto, created_at, updated_at" as const;

export const MAGAZZINO_RICAMBI_COLUMNS =
  "id, codice, nome, marca, quantita, stock_version, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at" as const;

export const MOVIMENTI_RICAMBI_COLUMNS =
  "id, ricambio_id, lavorazione_id, tipo, quantita, conta_statistiche, inventory_document_id, inventory_document_line_id, operation_id, meta, created_at" as const;

export const INVENTORY_DOCUMENTS_COLUMNS =
  "id, company_id, supplier_label, purchase_order_id, document_type, import_file_id, file_path, document_number, document_date, content_hash, document_ai_confidence, status, applied_at, applied_by, created_by, created_at, updated_at" as const;

export const INVENTORY_DOCUMENT_LINES_COLUMNS =
  "id, document_id, line_index, raw_code, extracted_description, extracted_quantity, received_quantity, unit, matched_item_id, match_confidence, match_status, apply_status, user_action, final_quantity, final_item_id, line_ai_confidence, created_at, updated_at" as const;

export const PREVENTIVI_COLUMNS =
  "id, mezzo_id, lavorazione_id, cliente, totale, dettagli, created_at, updated_at" as const;

export const BILLING_CUSTOMERS_COLUMNS =
  "id, cliente_label, entity_key, ragione_sociale, partita_iva, codice_fiscale, pec, codice_sdi, indirizzo, note, created_at, updated_at" as const;

export const INVOICES_COLUMNS =
  "id, numero, anno, status, document_type, document_status, payment_status, sdi_status, accounting_status, origine, customer_id, cliente_label, customer_snapshot, data_emissione, data_scadenza, imponibile, iva, totale, pagato, residuo, note, admin_notes, meta, parent_invoice_id, sent_to_customer_at, approved_at, approved_by, closed_at, version, created_by, updated_by, annullata_at, created_at, updated_at" as const;

export const CUSTOMER_OPEN_ITEMS_COLUMNS =
  "id, customer_id, source_type, source_id, invoice_id, document_number, currency, amount_signed, remaining_signed, due_date, status, opened_at, closed_at, created_at, updated_at" as const;

export const CUSTOMER_PAYMENTS_COLUMNS =
  "id, customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by, created_at, updated_at" as const;

export const PAYMENT_ALLOCATIONS_COLUMNS =
  "id, payment_id, open_item_id, amount, rounding_delta, note, created_at" as const;

export const INVOICE_EVENTS_COLUMNS =
  "id, entity_type, entity_id, aggregate_type, aggregate_id, invoice_id, event_category, event_type, correlation_id, causation_id, payload, actor_id, created_at" as const;

export const INVOICE_RELATIONS_COLUMNS =
  "id, source_invoice_id, target_invoice_id, relation_type, meta, created_at" as const;

export const ACCOUNTING_ENTRIES_COLUMNS =
  "id, entry_date, description, source_type, source_id, invoice_id, status, created_by, created_at" as const;

export const INVOICE_ROWS_COLUMNS =
  "id, invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent, imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta, created_at" as const;

export const INVOICE_LINKS_COLUMNS =
  "id, invoice_id, source_type, source_id, allocated_imponibile, allocated_iva, allocated_totale, meta, created_at" as const;

export const INVOICE_PAYMENTS_COLUMNS =
  "id, invoice_id, data, importo, metodo, riferimento, note, created_by, created_at" as const;

export const DDT_DOCUMENTS_COLUMNS =
  "id, numero, anno, serie, sede_id, status, data_documento, data_consegna, cliente_label, customer_snapshot, luogo_consegna, preventivo_id, lavorazione_id, mezzo_id, mezzo_snapshot, target_type, attrezzatura_id, attrezzatura_snapshot, causale_trasporto, vettore, note, origine, pdf_artifact_hash, created_by, updated_by, annullato_at, stampato_at, consegnato_at, created_at, updated_at" as const;

export const DDT_DOCUMENTS_INDEX_COLUMNS =
  "id, preventivo_id, status, numero, anno" as const;

export const DDT_ROWS_COLUMNS =
  "id, ddt_id, ordine, source_type, source_ref, preventivo_id, descrizione, codice, quantita, unita_misura, note, meta, created_at" as const;

export const DDT_LINKS_COLUMNS =
  "id, ddt_id, source_type, source_id, meta, created_at" as const;

export const PREVENTIVO_DDT_FULFILLMENT_COLUMNS =
  "preventivo_id, source_ref, qty_preventivo, qty_consegnata, qty_residua" as const;

export const ORDINI_FORNITORI_COLUMNS =
  "id, numero, status, data_ordine, fornitore_label, fornitore_snapshot, destinazione, destinazione_snapshot, logistica_snapshot, note, imponibile_righe, trasporto, imponibile, iva_percent, iva, totale, lavorazione_id, preventivo_id, scheda_lavorazione_id, pdf_artifact_hash, meta, created_by, updated_by, created_at, updated_at" as const;

export const ORDINI_FORNITORI_RIGHE_COLUMNS =
  "id, ordine_id, ordine, ricambio_id, codice, descrizione, quantita, prezzo_unitario, sconto_percent, totale_riga, meta, created_at" as const;

export const PREVENTIVI_BILLING_STATUS_COLUMNS =
  "preventivo_id, preventivo_totale, fatturato, residuo, stato_fatturazione" as const;

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
  "user_id, permission_id, effect, created_at, updated_at" as const;

export const AUTH_LOGS_COLUMNS =
  "id, user_id, email, action, ip, user_agent, created_at" as const;

export const DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS =
  "id, display_name, source_addetto_name, source_addetto_id, in_settings, created_at, updated_at" as const;

export const DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS =
  "id, dipendente_id, work_date, ore_ordinarie, ore_straordinarie, assenza, motivo_assenza, ore_assenza, note, tipo_assenza_id, tipo_assenza_label, employee_display_name_snapshot, employee_source_addetto_id_snapshot, updated_by, created_at, updated_at" as const;

export const REPORT_SAVED_KPI_CHARTS_COLUMNS =
  "id, user_id, name, config, schema_version, created_at, updated_at" as const;

export const REPORT_MANUAL_ENTRIES_COLUMNS =
  "id, period_month, completed_count, note, created_by, created_at, updated_at, deleted_at" as const;

export const OPERATIONAL_DIARY_ENTRIES_COLUMNS =
  "id, work_date, body, created_by, created_at, updated_at, deleted_at" as const;

export const LAVORAZIONE_DOCUMENTS_COLUMNS =
  "lavorazione_id, tipo, storage_path, filename, uploaded_at, uploaded_by" as const;

export const DASHBOARD_PROMEMORIA_COLUMNS =
  "id, created_at, updated_at, created_by, event_date, event_time, title, description, deleted_at, notified_on, entity_type, entity_id, series_id, recurrence_frequency, recurrence_interval, recurrence_until" as const;

export const CLIENTI_ANAGRAFICHE_COLUMNS =
  "id, nome_display, entity_key, ragione_sociale, partita_iva, codice_destinatario, sede_legale_uguale_operativa, in_lista_settings, note, updated_by, created_at, updated_at" as const;

/** Include meta (codice_fiscale import) — solo fetch server PDF/fatturazione. */
export const CLIENTI_ANAGRAFICHE_COLUMNS_WITH_META =
  `${CLIENTI_ANAGRAFICHE_COLUMNS}, meta` as const;

export const CLIENTI_SEDI_COLUMNS =
  "id, cliente_id, tipo, via, numero_civico, cap, citta, provincia, stato, created_at, updated_at" as const;

export const CLIENTI_CONTATTI_COLUMNS =
  "id, cliente_id, etichetta, tipo, valore, ordine, created_at, updated_at" as const;
