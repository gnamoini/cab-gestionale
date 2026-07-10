/** Provenienza campo — INV-02, INV-03. */

export type ManualOverrideReason =
  | "ai_wrong"
  | "unreadable_scan"
  | "customer_confirmed"
  | "missing_page"
  | "other";

export type FieldProvenanceSource = "ai" | "manual" | "rule" | "default";

export type FieldProvenance = {
  source: FieldProvenanceSource;
  pageIndex?: number;
  attemptId?: string;
  promptVersion?: string;
  schemaVersion?: string;
  manuallyEdited: boolean;
  editedAt?: string;
  editedBy?: string;
  overrideReason?: ManualOverrideReason;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
