import type { ListinoImportMeta } from "@/lib/magazzino/listino-import/listino-import-meta";

export type ListinoImportAction = "create" | "skip" | "update";

export type ListinoImportParseMethod = "spreadsheet" | "ai_pdf" | "ai_columns";

export type ListinoImportRawRow = {
  codice: string;
  descrizione: string;
  costo: number;
  marca?: string;
};

export type ListinoImportPreviewRow = ListinoImportRawRow & {
  rowIndex: number;
  suggestedAction: ListinoImportAction;
  duplicateRicambioId?: string;
  duplicateCodice?: string;
  existingCosto?: number;
  warnings?: string[];
};

export type ListinoImportPreviewResult = {
  batchId: string;
  documentoId: string;
  documentoNome: string;
  marcaDefault: string;
  parseMethod: ListinoImportParseMethod;
  rows: ListinoImportPreviewRow[];
  stats: {
    totalParsed: number;
    duplicates: number;
    invalid: number;
    truncated: boolean;
  };
  warnings: string[];
};

export type ListinoImportDecision = {
  rowIndex: number;
  action: ListinoImportAction;
  codice: string;
  descrizione: string;
  costo: number;
  marca?: string;
  duplicateRicambioId?: string;
};

export type ListinoImportExecuteResult = {
  batchId: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ rowIndex: number; message: string }>;
};

export type ListinoImportDeleteGeneratedResult = {
  deleted: number;
  blocked: Array<{ id: string; codice: string; reason: string }>;
};

export type MagazzinoDuplicateIndexEntry = {
  id: string;
  codice: string;
  entityKey: string | null;
  costo: number | null;
  nome: string;
  meta: Record<string, unknown> | null;
  listinoImport?: ListinoImportMeta;
};

export const LISTINO_IMPORT_MAX_PREVIEW_ROWS = 2000;
export const LISTINO_IMPORT_EXECUTE_CHUNK = 50;
