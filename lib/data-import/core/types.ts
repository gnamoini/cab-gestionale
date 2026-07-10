export type ImportEntity =
  | "magazzino_ricambi"
  | "clienti_anagrafica"
  | "listino_ricambi"
  | "mezzi"
  | "preventivi"
  | "settings_fornitori"
  | "settings_produttori"
  | "settings_categorie"
  | "settings_marche"
  | "settings_addetti"
  | "settings_cantieri"
  | "settings_utilizzatori"
  | "settings_hierarchy_attrezzature"
  | "settings_hierarchy_telai"
  | "lavorazioni"
  | "ordini_fornitori"
  | "fatture_draft"
  | "billing_customers"
  | "documenti_metadata"
  | "dipendenti_timesheet";

export type ImportBatchStatus = "pending" | "running" | "success" | "partial" | "failed" | "cancelled";

export type ImportDuplicateAction = "skip" | "update" | "replace" | "create_new";

export type ImportRowSeverity = "valid" | "warning" | "error";

export type ImportFieldDef = {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
  example?: string;
};

export type ImportColumnMapping = {
  sourceColumn: number;
  targetField: string;
};

export type ImportMappingConfig = {
  headerRowIndex: number;
  dataStartRowIndex: number;
  sheetIndex: number;
  columns: ImportColumnMapping[];
};

export type ImportDuplicateRules = {
  defaultAction: ImportDuplicateAction;
  updateFields?: string[];
};

export type ImportParseSheetInfo = {
  index: number;
  name: string;
  rowCount: number;
  columnCount: number;
};

export type ImportParseResult = {
  sheets: ImportParseSheetInfo[];
  matrix: unknown[][];
  warnings: string[];
  fileName: string;
};

export type ImportRowIssue = {
  field?: string;
  message: string;
  severity: "warning" | "error";
};

export type ImportPreviewRowBase = {
  rowIndex: number;
  severity: ImportRowSeverity;
  issues: ImportRowIssue[];
  suggestedAction: ImportDuplicateAction;
  duplicateId?: string;
  duplicateLabel?: string;
};

export type ImportPreviewStats = {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  duplicates: number;
  truncated: boolean;
};

export type ImportExecuteStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  warnings: number;
  createdEntityIds?: string[];
};

export type ImportExecuteError = {
  rowIndex: number;
  message: string;
};

export type ImportExecuteResult = {
  batchId: string;
  status: ImportBatchStatus;
  stats: ImportExecuteStats;
  errors: ImportExecuteError[];
  durationMs: number;
};

export type ImportBatchRecord = {
  id: string;
  entity: ImportEntity;
  status: ImportBatchStatus;
  file_name: string;
  mapping: Record<string, unknown>;
  rules: Record<string, unknown>;
  stats: Record<string, unknown>;
  error_log: unknown[];
  created_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const IMPORT_MAX_PREVIEW_ROWS = 2000;
export const IMPORT_EXECUTE_CHUNK = 50;

export const IMPORT_ENTITY_LABELS: Record<ImportEntity, string> = {
  magazzino_ricambi: "Magazzino ricambi",
  clienti_anagrafica: "Clienti anagrafica",
  listino_ricambi: "Listino ricambi",
  mezzi: "Mezzi",
  preventivi: "Preventivi",
  settings_fornitori: "Fornitori",
  settings_produttori: "Produttori",
  settings_categorie: "Categorie ricambi",
  settings_marche: "Marche ricambi",
  settings_addetti: "Operatori / addetti",
  settings_cantieri: "Cantieri",
  settings_utilizzatori: "Utilizzatori",
  settings_hierarchy_attrezzature: "Catalogo attrezzature",
  settings_hierarchy_telai: "Catalogo telai",
  lavorazioni: "Lavorazioni",
  ordini_fornitori: "Ordini fornitori",
  fatture_draft: "Fatture (bozze)",
  billing_customers: "Clienti fatturazione",
  documenti_metadata: "Documenti (metadati)",
  dipendenti_timesheet: "Dipendenti timesheet",
};
