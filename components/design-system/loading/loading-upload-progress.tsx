"use client";

import { memo } from "react";
import { dsBtnGhost } from "@/lib/ui/design-system";
import { UPLOAD_MESSAGES } from "@/lib/upload/upload-feedback-messages";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
import { LoadingProgressBar } from "./loading-progress-bar";
import { LoadingSpinner } from "./loading-spinner";
import { loadingCaptionClass } from "./loading-tokens";

export type LoadingUploadProgressProps = {
  fileName: string;
  label: string;
  phase: UploadFeedbackPhase;
  progress?: number | null;
  error?: string | null;
  onRetry?: (() => void) | null;
  onDismiss?: () => void;
  className?: string;
};

export const LoadingUploadProgress = memo(function LoadingUploadProgress({
  fileName,
  label,
  phase,
  progress = null,
  error = null,
  onRetry,
  onDismiss,
  className = "",
}: LoadingUploadProgressProps) {
  const uploading = phase === "uploading" || phase === "selected";
  const showProgress = uploading;
  const pctLabel =
    progress != null && Number.isFinite(progress) ? `${Math.round(progress)}%` : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={uploading}
      className={`pointer-events-auto flex min-w-0 items-start gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-2 pl-2.5 pr-2 shadow-[var(--cab-shadow-md)] ${className}`.trim()}
    >
      {uploading ? (
        <LoadingSpinner size="sm" className="mt-0.5" label={UPLOAD_MESSAGES.uploading} />
      ) : phase === "success" ? (
        <span className="mt-0.5 shrink-0 text-sm font-bold text-[color:var(--cab-success)]" aria-hidden>
          ✓
        </span>
      ) : phase === "error" ? (
        <span className="mt-0.5 shrink-0 text-sm font-bold text-[color:var(--cab-danger)]" aria-hidden>
          !
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[color:var(--cab-text)]">{label}</p>
        <p className={`truncate ${loadingCaptionClass}`}>{fileName}</p>
        <p className={loadingCaptionClass}>
          {uploading
            ? pctLabel
              ? `${UPLOAD_MESSAGES.uploading} ${pctLabel}`
              : UPLOAD_MESSAGES.uploading
            : phase === "success"
              ? UPLOAD_MESSAGES.success
              : phase === "error"
                ? error ?? UPLOAD_MESSAGES.error
                : null}
        </p>
        {showProgress ? (
          <LoadingProgressBar
            progress={progress}
            className="mt-1.5"
            label={`${label} ${pctLabel ?? ""}`.trim()}
          />
        ) : null}
        {phase === "error" && onRetry ? (
          <button
            type="button"
            className={`${dsBtnGhost} mt-1 px-1.5 py-0.5 text-[11px]`}
            onClick={onRetry}
          >
            {UPLOAD_MESSAGES.retry}
          </button>
        ) : null}
      </div>

      {(phase === "success" || phase === "error") && onDismiss ? (
        <button
          type="button"
          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"
          onClick={onDismiss}
          aria-label={UPLOAD_MESSAGES.dismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
});
