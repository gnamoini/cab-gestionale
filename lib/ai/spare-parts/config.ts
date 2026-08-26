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

