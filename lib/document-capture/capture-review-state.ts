/** Shared review gate — UI-only; domain DB maps into this vocabulary. */
export type CaptureReviewState =
  | "ready"
  | "needs_review"
  | "blocked"
  | "partial_success"
  | "approved";

export type CaptureReviewStateSummary = {
  state: CaptureReviewState;
  /** Human-readable summary for banners. */
  message?: string;
  totalLines?: number;
  recognizedLines?: number;
  reviewRequiredCount?: number;
};

export function resolveCaptureReviewState(input: {
  blocked?: boolean;
  approved?: boolean;
  reviewRequiredCount: number;
  totalLines: number;
  recognizedLines?: number;
}): CaptureReviewStateSummary {
  const { blocked, approved, reviewRequiredCount, totalLines } = input;
  const recognized =
    input.recognizedLines ?? Math.max(0, totalLines - reviewRequiredCount);

  if (approved) {
    return { state: "approved", totalLines, recognizedLines: recognized, reviewRequiredCount };
  }
  if (blocked) {
    return {
      state: "blocked",
      message: "Correggi gli errori prima di confermare l'importazione.",
      totalLines,
      recognizedLines: recognized,
      reviewRequiredCount,
    };
  }
  if (reviewRequiredCount > 0 && recognized > 0 && recognized < totalLines) {
    return {
      state: "partial_success",
      message: `${recognized}/${totalLines} righe riconosciute — ${reviewRequiredCount} richiedono revisione.`,
      totalLines,
      recognizedLines: recognized,
      reviewRequiredCount,
    };
  }
  if (reviewRequiredCount > 0) {
    return {
      state: "needs_review",
      message: `${reviewRequiredCount} riga/e richiedono revisione prima dell'importazione.`,
      totalLines,
      recognizedLines: recognized,
      reviewRequiredCount,
    };
  }
  return {
    state: "ready",
    message: "Pronto per la conferma importazione.",
    totalLines,
    recognizedLines: recognized,
    reviewRequiredCount: 0,
  };
}
