"use client";

import { memo } from "react";
import {
  loadingProgressFillClass,
  loadingProgressIndeterminateClass,
  loadingProgressTrackClass,
} from "./loading-tokens";

export type LoadingProgressBarProps = {
  /** 0–100; `null` = indeterminato. */
  progress?: number | null;
  className?: string;
  label?: string;
};

export const LoadingProgressBar = memo(function LoadingProgressBar({
  progress = null,
  className = "",
  label,
}: LoadingProgressBarProps) {
  const clamped =
    progress == null ? null : Math.max(0, Math.min(100, Math.round(progress)));
  const ariaValue = clamped ?? undefined;

  return (
    <div
      className={`${loadingProgressTrackClass} ${className}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={ariaValue}
      aria-label={label}
      aria-busy={clamped == null ? true : undefined}
    >
      {clamped == null ? (
        <div className={loadingProgressIndeterminateClass} aria-hidden />
      ) : (
        <div className={loadingProgressFillClass} style={{ width: `${clamped}%` }} aria-hidden />
      )}
    </div>
  );
});
