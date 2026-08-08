"use client";

import { memo, type CSSProperties } from "react";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import {
  LOADING_SPINNER_DURATION_MS,
  loadingSpinnerRingGeometryClass,
  loadingSpinnerSizeClass,
  loadingSpinnerToneRingClass,
  type LoadingSpinnerSize,
  type LoadingSpinnerTone,
} from "./loading-tokens";

export type LoadingSpinnerProps = {
  size?: LoadingSpinnerSize;
  tone?: LoadingSpinnerTone;
  className?: string;
  label?: string;
};

/** Spinner CAB — standard unico gestionale. */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = "md",
  tone = "default",
  className = "",
  label = GLOBAL_LOADING_MESSAGES.default,
}: LoadingSpinnerProps) {
  const dim = loadingSpinnerSizeClass[size];
  const ringStyle = {
    "--cab-spinner-duration": `${LOADING_SPINNER_DURATION_MS}ms`,
  } as CSSProperties;

  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex min-w-0 shrink-0 items-center justify-center ${className}`.trim()}
    >
      <span
        className={`${dim} ${loadingSpinnerRingGeometryClass} cab-spinner-ring ${loadingSpinnerToneRingClass[tone]}`}
        style={ringStyle}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
});
