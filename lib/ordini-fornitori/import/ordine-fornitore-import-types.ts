import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { OrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";

export const ORDINE_FORNITORE_IMPORT_EXTRACTION_VERSION = "1";

export type ImportQualityLevel = "high" | "medium" | "low";

export type ImportQuality = {
  score: number;
  level: ImportQualityLevel;
};

export type FornitoreMatchMethod = "piva" | "cf" | "exact" | "normalized" | "fuzzy" | "none";

export type FornitoreMatchResult = {
  matched: boolean;
  label: string;
  matchMethod: FornitoreMatchMethod;
  matchScore?: number;
  confidence: number;
  snapshotProposal?: OrdineFornitoreFornitoreSnapshot;
};

export type OrdineFornitoreImportMeta = {
  source: "supplier_quote";
  documentId: string;
  contentHash: string;
  semanticKey?: string;
  importedAt: string;
  importedBy: string;
  extractionVersion: string;
  quality: ImportQuality;
};

export type ImportDuplicateHit = {
  ordineId: string;
  ordineNumero: string | null;
  fornitoreLabel: string | null;
};

export type ImportDuplicateCheck = {
  hashDuplicate: ImportDuplicateHit | null;
  semanticDuplicate: ImportDuplicateHit | null;
};

export type OrdineFornitoreImportAnalyzeResult = {
  record: OrdineFornitoreRecord;
  quality: ImportQuality;
  warnings: string[];
  duplicates: ImportDuplicateCheck;
  documentoId: string;
  contentHash: string;
  semanticKey: string | null;
  fornitoreMatch: FornitoreMatchResult;
  matchedRigheCount: number;
  totalRigheCount: number;
};

export type OrdineFornitoreEditorImportMeta = {
  documentoId: string;
  contentHash: string;
  semanticKey: string | null;
  quality: ImportQuality;
  saved: boolean;
};
