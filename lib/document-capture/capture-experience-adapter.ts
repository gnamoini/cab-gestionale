import type { CaptureReviewStateSummary } from "@/lib/document-capture/capture-review-state";

export type CaptureDomain = "lavorazioni" | "ddt";

export type CaptureStep = {
  id: string;
  label: string;
  shortLabel: string;
};

export type CaptureStepCopy = { title: string; subtitle: string };

export type ReviewColumnType =
  | "text"
  | "confidence"
  | "matcher"
  | "quantity"
  | "currency"
  | "status";

export type ReviewColumn = {
  id: string;
  label: string;
  type: ReviewColumnType;
};

export type UploadConfig = {
  accept: string;
  formatHint: string;
  dropTitle: string;
  dropHint: string;
  chooseLabel: string;
  dragHint: string;
};

export type ReviewConfig = {
  columns: ReviewColumn[];
};

export type ApplyConfig = {
  confirmLabel: string;
  confirmLoadingLabel: string;
  successMessage: string;
};

export type CaptureReviewStateResolver = (ctx: {
  reviewRequiredCount: number;
  totalLines: number;
  blocked?: boolean;
  approved?: boolean;
}) => CaptureReviewStateSummary;

/** SSOT contract — each domain launcher declares one adapter. See docs/design/DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT.md */
export interface CaptureExperienceAdapter {
  domain: CaptureDomain;
  steps: CaptureStep[];
  stepCopy: Record<string, CaptureStepCopy>;
  upload: UploadConfig;
  review: ReviewConfig;
  apply: ApplyConfig;
  reviewState: CaptureReviewStateResolver;
  ariaLabel: string;
}
