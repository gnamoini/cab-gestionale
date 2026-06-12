import type { DocumentoApplicabilita } from "@/lib/types/gestionale";

/** Metadata-only DTO for documenti list views — no binary URLs. */
export type DocumentoListRow = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  owner: string;
  storageKey: string;
  /** @deprecated Prefer hasPreview */
  previewAvailable: boolean;
  hasPreview: boolean;
  categoria: string;
  marca: string;
  modello: string | null;
  applicabilita?: DocumentoApplicabilita;
};
