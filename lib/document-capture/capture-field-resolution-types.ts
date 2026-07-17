export type CaptureFieldResolutionKind = "AUTO_MATCH" | "MANUAL_PICK" | "UNRESOLVED";

export type CaptureFieldReviewStatus = "AUTO_ACCEPTED" | "REVIEW_REQUIRED" | "REJECTED";

export type CaptureFieldResolution = {
  value: string;
  normalized: string | null;
  entityId: string | null;
  confidence: number;
  resolution: CaptureFieldResolutionKind;
  reviewStatus: CaptureFieldReviewStatus;
};

export type RicambiMatchStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

export type RicambiRowResolution = {
  rowIndex: number;
  fieldKey: string;
  status: RicambiMatchStatus;
  ricambioId: string | null;
  label: string;
  confidence: number;
  candidates?: Array<{ id: string; label: string; score: number }>;
};
