/** Tipi allineati allo schema PostgreSQL / Supabase (snake_case). */

export type RuoloUtente =
  | "admin"
  | "manager"
  | "operatore"
  | "addetto_amministrativo"
  | "cliente"
  | "guest"
  | "ospite"
  | "magazziniere"
  | "commerciale";

/** @deprecated Usare `RuoloUtente`. */
export type RuoloProfile = RuoloUtente;

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PermissionRow = {
  id: string;
  key: string;
  module: string | null;
  action: string | null;
  label: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  nome: string;
  cognome?: string | null;
  /** Nome utente univoco per login (minuscolo, 3–32 caratteri). */
  username?: string | null;
  role_key: string;
  /** @deprecated Alias — use role_key */
  ruolo?: RuoloUtente;
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

export type InterventoTargetType = "telaio" | "attrezzatura";

export type MezzoRow = {
  id: string;
  cliente: string;
  utilizzatore: string | null;
  targa: string | null;
  numero_scuderia: string | null;
  anno: number | null;
  meta: Record<string, unknown> | null;
  /** Chiave normalizzata per dedupe/ricerca (Global Validation Layer). */
  entity_key?: string | null;
  /** Campi attrezzatura su embed UI/report (da join tabella attrezzature, non colonne DB). */
  marca?: string;
  modello?: string;
  matricola?: string | null;
  tipo_attrezzatura?: string | null;
  /** Telaio — colonne promote da meta (migrazione attrezzature). */
  marca_telaio?: string | null;
  modello_telaio?: string | null;
  tipo_telaio?: string | null;
  telaio_num?: string | null;
  /** Generated STORED — read-only; unicità VIN. Non in payload write. */
  telaio_num_norm?: string | null;
  km?: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

/** MezzoRow con campi attrezzatura compositi (embed join / report). */
export type MezzoEmbedRow = MezzoRow & {
  marca: string;
  modello: string;
  tipo_attrezzatura: string;
};

export type AttrezzaturaRow = {
  id: string;
  mezzo_id: string;
  marca: string;
  modello: string;
  tipo_attrezzatura: string | null;
  matricola: string | null;
  portata: string | null;
  anno: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AssetKind = "mezzo" | "attrezzatura";

export type ComplianceRuleKind =
  | "revisione"
  | "tagliando"
  | "assicurazione"
  | "bollo"
  | "verifica_attrezzatura"
  | "collaudo"
  | "altro";

export type ComplianceTriggerKind = "date_interval" | "fixed_date" | "km_interval" | "one_shot";

export type MileageSource = "scheda" | "manual" | "import" | "correction";

export type AssignmentChangeReason =
  | "installazione"
  | "smontaggio"
  | "spostamento"
  | "correzione"
  | "altro";

export type ComplianceRecordEsito = "ok" | "non_conforme" | "rinviato";

export type AssetComplianceRuleRow = {
  id: string;
  asset_kind: AssetKind;
  mezzo_id: string | null;
  attrezzatura_id: string | null;
  rule_kind: ComplianceRuleKind;
  trigger_kind: ComplianceTriggerKind;
  interval_months: number | null;
  fixed_month: number | null;
  fixed_day: number | null;
  km_interval: number | null;
  last_completed_at: string | null;
  next_due_at: string | null;
  next_due_km: number | null;
  alert_days_before: number;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AssetComplianceRecordRow = {
  id: string;
  rule_id: string | null;
  asset_kind: AssetKind;
  mezzo_id: string | null;
  attrezzatura_id: string | null;
  rule_kind: ComplianceRuleKind;
  completed_at: string;
  km_at_completion: number | null;
  document_ref: string | null;
  esito: ComplianceRecordEsito;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

export type AssetAssignmentHistoryRow = {
  id: string;
  attrezzatura_id: string;
  mezzo_id: string;
  valid_from: string;
  valid_to: string | null;
  change_reason: AssignmentChangeReason;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

export type AssetMileageReadingRow = {
  id: string;
  mezzo_id: string;
  recorded_at: string;
  km: number;
  source: MileageSource;
  lavorazione_id: string | null;
  created_by: string | null;
  note: string | null;
  created_at: string;
};

export type TipoAttrezzaturaCatalogRow = {
  id: string;
  label: string;
  label_norm: string;
  created_at: string;
  updated_at: string;
};

export type MaintenancePlanRow = {
  id: string;
  nome: string;
  interval_ore: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
};

export type MaintenancePlanEquipmentTypeRow = {
  id: string;
  plan_id: string;
  tipo_attrezzatura_id: string;
  created_at: string;
};

export type MaintenancePlanPartRow = {
  id: string;
  plan_id: string;
  ricambio_id: string;
  quantita: number;
  created_at: string;
  updated_at: string;
};

export type VehicleMaintenanceServiceRow = {
  id: string;
  mezzo_id: string;
  plan_id: string;
  performed_at: string;
  ore_at_service: number;
  mezzo_ore_snapshot: number | null;
  note: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type VehicleMaintenanceServicePartRow = {
  id: string;
  service_id: string;
  ricambio_id: string;
  quantita: number;
  descrizione_snapshot: string | null;
  created_at: string;
};

export type AssetTimelineProjectionRow = {
  event_category: string;
  event_domain: "lifecycle";
  source_id: string;
  asset_kind: AssetKind;
  mezzo_id: string | null;
  attrezzatura_id: string | null;
  event_at: string;
  event_subtype: string;
  priority: "low" | "medium" | "high" | "urgent";
  label: string;
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
  /** Ultimo operatore che ha modificato la riga lavorazione (stato, priorità, …). */
  updated_by?: string | null;
  /** Portale clienti: archiviata manualmente (indipendente dallo stato). */
  archived?: boolean;
  archived_at?: string | null;
  /** Eliminazione logica: esclusa da liste operative e statistiche. */
  deleted_at?: string | null;
  /** Codice umano display (es. 26-0001). Generato server-side. */
  codice?: string | null;
  /** Target intervento: telaio (mezzo) o attrezzatura installata. */
  target_type?: InterventoTargetType;
  attrezzatura_id?: string | null;
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
  /** false = rettifica inventario, esclusa da KPI/report. */
  conta_statistiche: boolean;
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

/** Grafici KPI salvati per utente (`report_saved_kpi_charts`). */
export type ReportSavedKpiChartRow = {
  id: string;
  user_id: string;
  name: string;
  config: Record<string, unknown>;
  schema_version: number;
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

/** Diario operativo giornaliero (`operational_diary_entries`). */
export type OperationalDiaryEntryRow = {
  id: string;
  work_date: string;
  body: string;
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

export type InvoiceStatus =
  | "bozza"
  | "da_verificare"
  | "emessa"
  | "inviata"
  | "parzialmente_pagata"
  | "pagata"
  | "scaduta"
  | "annullata";

export type InvoiceDocumentStatus = "bozza" | "da_verificare" | "approvata" | "emessa" | "annullata";

export type InvoicePaymentStatus = "non_pagata" | "parzialmente_pagata" | "pagata" | "scaduta";

export type InvoiceSdiStatus =
  | "non_applicabile"
  | "da_generare"
  | "generata"
  | "inviata"
  | "consegnata"
  | "scartata"
  | "rifiutata";

export type InvoiceAccountingStatus =
  | "non_rilevante"
  | "da_registrare"
  | "registrata"
  | "da_liquidare"
  | "liquidata"
  | "chiusa"
  | "contestata";

export type InvoiceDocumentType = "fattura" | "nota_credito" | "proforma";

export type InvoiceTransition =
  | "create_draft"
  | "submit_for_review"
  | "approve"
  | "emit"
  | "mark_sent_to_customer"
  | "register_payment_partial"
  | "register_payment_full"
  | "mark_overdue"
  | "cancel";

export type InvoiceRowTipo =
  | "ricambio"
  | "articolo_magazzino"
  | "manodopera"
  | "lavorazione"
  | "costo_extra"
  | "libera";

export type InvoiceLinkSourceType = "preventivo" | "lavorazione" | "mezzo" | "attrezzatura" | "ricambio" | "ddt";

export type InvoicePaymentMetodo = "bonifico" | "contanti" | "assegno" | "pos" | "altro";

export type BillingCustomerRow = {
  id: string;
  cliente_label: string;
  entity_key: string | null;
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  pec: string | null;
  codice_sdi: string | null;
  indirizzo: Record<string, unknown>;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  numero: number;
  anno: number;
  status: InvoiceStatus;
  document_type: InvoiceDocumentType | null;
  document_status: InvoiceDocumentStatus | null;
  payment_status: InvoicePaymentStatus | null;
  sdi_status: InvoiceSdiStatus | null;
  accounting_status: InvoiceAccountingStatus | null;
  origine: string | null;
  customer_id: string | null;
  cliente_label: string;
  customer_snapshot: Record<string, unknown>;
  data_emissione: string;
  data_scadenza: string | null;
  imponibile: number;
  iva: number;
  totale: number;
  pagato: number;
  residuo: number;
  note: string | null;
  admin_notes: string | null;
  meta: Record<string, unknown>;
  parent_invoice_id: string | null;
  sent_to_customer_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  closed_at: string | null;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  annullata_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineRow = {
  id: string;
  invoice_id: string;
  tipo: InvoiceRowTipo;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  sconto_percent: number;
  iva_percent: number;
  imponibile: number;
  iva: number;
  totale: number;
  ricambio_id: string | null;
  lavorazione_id: string | null;
  preventivo_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type InvoiceLinkRow = {
  id: string;
  invoice_id: string;
  source_type: InvoiceLinkSourceType;
  source_id: string;
  allocated_imponibile: number;
  allocated_iva: number;
  allocated_totale: number;
  meta: Record<string, unknown>;
  created_at: string;
};

export type InvoicePaymentRow = {
  id: string;
  invoice_id: string;
  data: string;
  importo: number;
  metodo: InvoicePaymentMetodo;
  riferimento: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CustomerOpenItemRow = {
  id: string;
  customer_id: string | null;
  source_type: "invoice" | "credit_note" | "customer_advance" | "manual_adjustment";
  source_id: string | null;
  invoice_id: string | null;
  document_number: string | null;
  currency: string;
  amount_signed: number;
  remaining_signed: number;
  due_date: string | null;
  status: "open" | "partial" | "closed";
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerPaymentRow = {
  id: string;
  customer_id: string | null;
  data: string;
  importo: number;
  metodo: InvoicePaymentMetodo;
  riferimento: string | null;
  note: string | null;
  allocation_status: "unallocated" | "partial" | "allocated";
  legacy_invoice_payment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentAllocationRow = {
  id: string;
  payment_id: string;
  open_item_id: string;
  amount: number;
  rounding_delta: number;
  note: string | null;
  created_at: string;
};

export type InvoiceEventRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  aggregate_type: string;
  aggregate_id: string;
  invoice_id: string | null;
  event_category: "document" | "payment" | "sdi" | "accounting" | "audit";
  event_type: string;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type InvoiceRelationRow = {
  id: string;
  source_invoice_id: string;
  target_invoice_id: string;
  relation_type: "credit_note" | "correction" | "replacement";
  meta: Record<string, unknown>;
  created_at: string;
};

export type AccountingEntryRow = {
  id: string;
  entry_date: string;
  description: string;
  source_type: string | null;
  source_id: string | null;
  invoice_id: string | null;
  status: "draft" | "posted" | "reversed";
  created_by: string | null;
  created_at: string;
};

export type AccountingEntryLineRow = {
  id: string;
  entry_id: string;
  account_code: string;
  description: string | null;
  debit: number;
  credit: number;
  created_at: string;
};

export type PreventivoBillingStatusRow = {
  preventivo_id: string;
  preventivo_totale: number;
  fatturato: number;
  residuo: number;
  stato_fatturazione: "non_fatturato" | "parzialmente_fatturato" | "totalmente_fatturato";
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

/** Tabella `user_permissions` — override utente (permission_id + effect). */
export type UserPermissionRow = {
  user_id: string;
  permission_id: string;
  effect: "allow" | "deny";
  created_at?: string;
  updated_at?: string;
  permissions?: Pick<PermissionRow, "key" | "module" | "action"> | null;
  /** @deprecated Colonne legacy pre-migrazione RBAC — solo compat tipi security UI. */
  module?: string;
  can_read?: boolean;
  can_write?: boolean;
  can_admin?: boolean;
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

/** Anagrafica clienti estesa (`clienti_anagrafiche`). */
export type ClienteAnagraficaRow = {
  id: string;
  nome_display: string;
  entity_key: string;
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_destinatario: string | null;
  sede_legale_uguale_operativa: boolean;
  in_lista_settings: boolean;
  note: string | null;
  meta: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteSedeRow = {
  id: string;
  cliente_id: string;
  tipo: "operativa" | "legale";
  via: string | null;
  numero_civico: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  stato: string;
  created_at: string;
  updated_at: string;
};

export type ClienteContattoRow = {
  id: string;
  cliente_id: string;
  etichetta: string;
  tipo: string;
  valore: string;
  ordine: number;
  created_at: string;
  updated_at: string;
};

export type DdtDocumentRow = {
  id: string;
  numero: number | null;
  anno: number;
  serie: string;
  sede_id: string | null;
  status: "bozza" | "confermato" | "stampato" | "consegnato" | "annullato";
  data_documento: string;
  data_consegna: string | null;
  cliente_label: string;
  customer_snapshot: Record<string, unknown>;
  luogo_consegna: Record<string, unknown>;
  preventivo_id: string | null;
  lavorazione_id: string | null;
  mezzo_id: string | null;
  mezzo_snapshot: Record<string, unknown>;
  causale_trasporto: string | null;
  vettore: string | null;
  note: string | null;
  origine: string;
  pdf_artifact_hash: string | null;
  created_by: string | null;
  updated_by: string | null;
  annullato_at: string | null;
  stampato_at: string | null;
  consegnato_at: string | null;
  target_type?: InterventoTargetType | null;
  attrezzatura_id?: string | null;
  attrezzatura_snapshot?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DdtLineRow = {
  id: string;
  ddt_id: string;
  ordine: number;
  source_type: string;
  source_ref: string;
  preventivo_id: string | null;
  descrizione: string;
  codice: string | null;
  quantita: number;
  unita_misura: string;
  note: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type DdtLinkRow = {
  id: string;
  ddt_id: string;
  source_type: string;
  source_id: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type PreventivoDdtFulfillmentRow = {
  preventivo_id: string;
  source_ref: string;
  qty_preventivo: number;
  qty_consegnata: number;
  qty_residua: number;
};

export type OrdineFornitoreRow = {
  id: string;
  numero: string | null;
  status: "bozza" | "inviato" | "confermato" | "spedito" | "ricevuto" | "annullato";
  data_ordine: string;
  fornitore_label: string;
  fornitore_snapshot: Record<string, unknown>;
  destinazione: string | null;
  destinazione_snapshot: Record<string, unknown>;
  logistica_snapshot: Record<string, unknown>;
  note: string | null;
  imponibile_righe: number;
  trasporto: number;
  imponibile: number;
  iva_percent: number;
  iva: number;
  totale: number;
  lavorazione_id: string | null;
  preventivo_id: string | null;
  scheda_lavorazione_id: string | null;
  pdf_artifact_hash: string | null;
  meta: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrdineFornitoreRigaRow = {
  id: string;
  ordine_id: string;
  ordine: number;
  ricambio_id: string | null;
  codice: string | null;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  sconto_percent: number;
  totale_riga: number;
  meta: Record<string, unknown>;
  created_at: string;
};

export type InventoryQrTokenRow = {
  id: string;
  token: string;
  entity_type: string;
  entity_id: string;
  status: "active" | "revoked" | "expired";
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  superseded_by: string | null;
};

export type InventoryLabelArtifactRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  hash: string;
  format: "png" | "svg" | "pdf";
  preset: string;
  template_id: string;
  storage_path: string;
  generator_version: string;
  template_version: string;
  created_at: string;
};

export type LabelGenerationJobRow = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  entity_ids: string[];
  preset: string;
  format: string;
  result_storage_path: string | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};
