import type { DocumentModelMetadata } from "@/lib/document-capture/model/versions";
import type { FieldProvenance } from "@/lib/document-capture/model/provenance";

/** SSOT documento — solo rappresentazione fedele (INV-12: no InterventionCandidate). */

export type PagePhysicalMeta = {
  rotation?: number;
  width?: number;
  height?: number;
  isEmpty: boolean;
  isDuplicateOf?: number;
  byteSize?: number;
};

export type PageClassification = {
  sectionType: string;
  confidence?: number;
};

export type DocumentField = {
  key: string;
  value: string | null;
  confidence: number;
  provenance: FieldProvenance;
};

export type Section = {
  sectionType: string;
  fields: DocumentField[];
};

export type Page = {
  index: number;
  physical: PagePhysicalMeta;
  classification?: PageClassification;
  sections: Section[];
};

export type DocumentCompleteness = "complete" | "partial" | "unknown";

export type DigitalDocument = {
  id: string;
  documentType: string;
  completeness: DocumentCompleteness;
  metadata: DocumentModelMetadata;
  pages: Page[];
};
