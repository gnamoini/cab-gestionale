"use client";

import { memo } from "react";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import {
  loadingSpinnerRingClass,
  loadingSpinnerSizeClass,
  type LoadingSpinnerSize,
} from "./loading-tokens";

export type LoadingSpinnerProps = {
  size?: LoadingSpinnerSize;
  className?: string;
  label?: string;
};

/** Spinner CAB — standard unico gestionale. */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = "md",
  className = "",
  label = GLOBAL_LOADING_MESSAGES.default,
}: LoadingSpinnerProps) {
  const dim = loadingSpinnerSizeClass[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex min-w-0 shrink-0 items-center justify-center ${className}`.trim()}
    >
      <span className={`${dim} ${loadingSpinnerRingClass}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
});
