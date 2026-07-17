"use client";

import { memo } from "react";
import { LoadingProgressBar, LoadingSpinner } from "@/components/design-system/loading";
import { UPLOAD_MESSAGES } from "@/lib/upload/upload-feedback-messages";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
import { dsBtnGhost } from "@/lib/ui/design-system";

export const UploadStatusInline = memo(function UploadStatusInline({
  phase,
  fileName,
  error,
  progress = null,
  onRetry,
  className = "",
  compact = false,
}: {
  phase: UploadFeedbackPhase;
  fileName?: string;
  error?: string | null;
  progress?: number | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  if (phase === "idle") return null;

  const name = fileName?.trim();
  const pad = compact ? "px-2 py-1" : "px-2.5 py-1.5";
  const textSize = compact ? "text-[11px]" : "text-xs";

  if (phase === "selected") {
    return (
      <p
        role="status"
        className={`${className} ${pad} ${textSize} rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] text-[color:var(--cab-text)]`}
      >
        <span className="font-semibold text-[color:var(--cab-primary)]">✓</span>{" "}
        {UPLOAD_MESSAGES.selected}
        {name ? (
          <>
            {": "}
            <span className="font-medium">{name}</span>
          </>
        ) : null}
      </p>
    );
  }

  if (phase === "uploading") {
    const pctLabel = progress != null ? `${Math.round(progress)}%` : null;
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`${className} ${pad} ${textSize} rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text-muted)]`}
      >
        <p className="flex min-w-0 items-center gap-2">
          <LoadingSpinner size="sm" label={UPLOAD_MESSAGES.uploading} />
          <span>
            {UPLOAD_MESSAGES.uploading}
            {pctLabel ? ` ${pctLabel}` : null}
            {name ? (
              <>
                {" "}
                <span className="font-medium text-[color:var(--cab-text)]">{name}</span>
              </>
            ) : null}
          </span>
        </p>
        <LoadingProgressBar progress={progress} className="mt-1.5" label={name ?? UPLOAD_MESSAGES.uploading} />
      </div>
    );
  }

  if (phase === "success") {
    return (
      <p
        role="status"
        className={`${className} ${pad} ${textSize} rounded-lg border border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_10%,var(--cab-surface))] text-[color:var(--cab-text)]`}
      >
        <span className="font-semibold text-[color:var(--cab-success)]">✓</span> {UPLOAD_MESSAGES.success}
      </p>
    );
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className={`${className} ${pad} ${textSize} rounded-lg border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] text-[color:var(--cab-text)]`}
      >
        <p className="font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]">
          {error?.trim() || "Caricamento non riuscito."}
        </p>
        {onRetry ? (
          <button type="button" className={`${dsBtnGhost} mt-1.5 px-2 py-1`} onClick={onRetry}>
            {UPLOAD_MESSAGES.retry}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
});
