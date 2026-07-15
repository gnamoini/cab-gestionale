"use client";

import { LoadingSpinner } from "@/components/design-system/loading";
import { dsHubModalSection } from "@/lib/ui/design-system";
import type { ReactNode } from "react";

/** Offset sticky anteprima review — sotto step indicator (nav ~5.5rem). */
export const CAPTURE_REVIEW_PIN_TOP_CLASS = "top-[var(--capture-review-pin-top,5.5rem)]";

export function CaptureReviewPanelFrame({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${dsHubModalSection} flex min-h-[14rem] flex-col space-y-2 p-3 ${className}`.trim()}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-[color:var(--cab-fg)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CaptureReviewPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2.5" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-[var(--ds-radius-md)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-border))]"
          style={{ width: i % 3 === 2 ? "72%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function CaptureReviewPanelLoading({
  title,
  message,
  skeleton = "fields",
}: {
  title: string;
  message: string;
  skeleton?: "fields" | "preview";
}) {
  return (
    <CaptureReviewPanelFrame title={title}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6" role="status">
        <LoadingSpinner size="sm" />
        <p className="text-center text-sm text-[color:var(--cab-muted-fg)]">{message}</p>
        {skeleton === "preview" ? (
          <div
            className="mt-1 w-full max-w-full animate-pulse rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-border))]"
            style={{ aspectRatio: "210 / 297", maxHeight: "min(28rem, 50vh)" }}
            aria-hidden
          />
        ) : (
          <CaptureReviewPanelSkeleton />
        )}
      </div>
    </CaptureReviewPanelFrame>
  );
}

export function CaptureReviewPanelError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <CaptureReviewPanelFrame title={title}>
      <div className="flex flex-1 flex-col justify-center gap-2 py-6 text-sm">
        <p className="text-[color:var(--cab-danger)]">{message}</p>
        {onRetry ? (
          <button type="button" className="w-fit text-xs underline" onClick={onRetry}>
            Riprova
          </button>
        ) : null}
      </div>
    </CaptureReviewPanelFrame>
  );
}
