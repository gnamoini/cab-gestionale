import type { ListinoImportMeta } from "@/lib/magazzino/listino-import/listino-import-meta";

export type ListinoImportAction = "create" | "skip" | "update";

export type ListinoImportParseMethod = "spreadsheet" | "ai_pdf" | "ai_columns";

export type ListinoImportRawRow = {
  codice: string;
  descrizione: string;
  costo: number;
  marca?: string;
  categoria?: string;
};

export type ListinoImportCategoriaSource = "heuristic" | "ai" | "fallback";

export type ListinoImportPreviewRow = ListinoImportRawRow & {
  rowIndex: number;
  suggestedAction: ListinoImportAction;
  categoriaSource?: ListinoImportCategoriaSource;
  duplicateRicambioId?: string;
  duplicateCodice?: string;
  existingCosto?: number;
  warnings?: string[];
};

export type ListinoImportPreviewResult = {
  batchId: string;
  documentoId?: string;
  importFileId?: string;
  documentoNome: string;
  marcaDefault: string;
  parseMethod: ListinoImportParseMethod;
  categorieDisponibili: string[];
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
  categoria?: string;
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
/** Max UUID per singola query `.in()` — evita URL troppo lunghi (ponytail: 80 come schede). */
export const LISTINO_IMPORT_DELETE_IN_CHUNK = 80;

/** PDF listino: pagine per blocco Gemini (listini multipagina). */
export const LISTINO_PDF_PAGES_PER_CHUNK = 12;
/** PDF ≤ N pagine: una sola chiamata Gemini. */
export const LISTINO_PDF_SINGLE_CALL_MAX_PAGES = 16;
/** Chiamate Gemini parallele max per listino PDF (1 = sequenziale, evita 429). */
export const LISTINO_PDF_CHUNK_CONCURRENCY = 1;
/** Pausa tra un blocco e il successivo (ms). */
export const LISTINO_PDF_CHUNK_DELAY_MS = 5_000;
/** Limite sicurezza blocchi (oltre → errore esplicito). */
export const LISTINO_PDF_MAX_CHUNKS = 40;
/** Blocchi max stimati nel budget route sequenziale (~600s / ~60s per blocco). */
export const LISTINO_PDF_BUDGET_WAVES = 10;

/** Pagine per blocco in base al totale — meno chiamate su PDF lunghi. */
export function resolveListinoPdfPagesPerChunk(
  pageCount: number,
  options?: { pagesPerChunkMin?: number },
): number {
  const minChunk = options?.pagesPerChunkMin ?? LISTINO_PDF_PAGES_PER_CHUNK;
  if (pageCount <= LISTINO_PDF_SINGLE_CALL_MAX_PAGES) return pageCount;
  const targetChunks = Math.min(LISTINO_PDF_MAX_CHUNKS, LISTINO_PDF_BUDGET_WAVES);
  return Math.max(minChunk, Math.ceil(pageCount / targetChunks));
}
