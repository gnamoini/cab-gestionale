import "server-only";

import { readRuntimeSecret } from "@/lib/ai/runtime/env-reader";

const DEFAULT_EMBEDDING_CANDIDATES = [
  "gemini-embedding-2-preview",
  "models/gemini-embedding-2-preview",
  "gemini-embedding-2",
  "models/gemini-embedding-2",
] as const;

export function readSparePartsEmbeddingModel(): string {
  const fromEnv = readRuntimeSecret("GEMINI_FILE_SEARCH_EMBEDDING_MODEL")?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_EMBEDDING_CANDIDATES[0];
}

export function readSparePartsIdentificationModel(): string {
  return (
    readRuntimeSecret("GEMINI_MODEL_PART_IDENTIFICATION")?.trim() ||
    readRuntimeSecret("AI_MODEL_GOOGLE")?.trim() ||
    readRuntimeSecret("GEMINI_MODEL_ID")?.trim() ||
    "gemini-3.5-flash"
  );
}

export function readSparePartsDocumentAnalysisModel(): string {
  return (
    readRuntimeSecret("GEMINI_MODEL_DOCUMENT_ANALYSIS")?.trim() ||
    readSparePartsIdentificationModel()
  );
}

export function readMaxConcurrentDocumentIndexing(): number {
  const raw = readRuntimeSecret("AI_SPARE_PARTS_MAX_CONCURRENT_INDEXING");
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  return 2;
}

export function readMaxConcurrentPartSearch(): number {
  const raw = readRuntimeSecret("AI_SPARE_PARTS_MAX_CONCURRENT_SEARCH");
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  return 2;
}

/** Store Gemini File Search riutilizzabile (evita create ad ogni job). */
export function readSparePartsListinoPagesPerChunkMin(): number {
  const raw = readRuntimeSecret("AI_SPARE_PARTS_LISTINO_PAGES_PER_CHUNK");
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isFinite(n) && n >= 12 && n <= 80) return n;
  return 40;
}

/** Pausa tra blocchi listino Ricambi AI — riduce 429 su piano free. */
export function readSparePartsListinoChunkDelayMs(): number {
  const raw = readRuntimeSecret("AI_SPARE_PARTS_LISTINO_CHUNK_DELAY_MS");
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isFinite(n) && n >= 5_000 && n <= 120_000) return n;
  return 45_000;
}

export function readFileSearchStoreName(): string | null {
  const fromEnv = readRuntimeSecret("GEMINI_FILE_SEARCH_STORE_NAME")?.trim();
  return fromEnv || null;
}

/** Attesa massima polling upload File Search (ms). Default 8 min. */
export function readFileSearchUploadTimeoutMs(): number {
  const raw = readRuntimeSecret("GEMINI_FILE_SEARCH_UPLOAD_TIMEOUT_MS");
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isFinite(n) && n >= 60_000 && n <= 900_000) return n;
  return 480_000;
}

