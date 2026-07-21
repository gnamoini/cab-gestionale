"use client";

import { captureReviewAllowsForceApply } from "@/lib/document-capture/validation/validate-capture-for-apply";
import type { ValidateCaptureResult } from "@/lib/document-capture/validation/validate-capture-for-apply";

export function CaptureApplyReviewBanner({
  validation,
  busy,
  onForceReview,
}: {
  validation: ValidateCaptureResult | null | undefined;
  busy?: boolean;
  onForceReview: () => void;
}) {
  if (!validation || validation.status !== "REVIEW" || !captureReviewAllowsForceApply(validation)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
      <span>Alcuni campi richiedono conferma prima del salvataggio.</span>
      <button
        type="button"
        className="erp-btn erp-btn-secondary min-h-9 text-xs"
        disabled={busy}
        onClick={onForceReview}
      >
        Procedi comunque
      </button>
    </div>
  );
}
