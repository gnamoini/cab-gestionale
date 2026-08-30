"use client";

import { CaptureStatusProgress } from "@/components/document-capture/capture-acquisition-progress-panel";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
import { dsHubModalSection, dsSkeletonPulse } from "@/lib/ui/design-system";
import type { ReactNode } from "react";

/** Offset sticky anteprima review — sotto step indicator (nav ~5.5rem). */
export const CAPTURE_REVIEW_PIN_TOP_CLASS = "top-[var(--capture-review-pin-top,5.5rem)]";

/** Colonna form review capture — scroll annidato (solo variant `panel`). */
export const CAPTURE_REVIEW_PANEL_SCROLL_CLASS =
  "min-h-0 min-w-0 overflow-y-auto overscroll-y-contain gestionale-scrollbar [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]";

export const CAPTURE_REVIEW_SCROLL_PANEL_CLASS =
  `${CAPTURE_REVIEW_PANEL_SCROLL_CLASS} max-lg:max-h-[min(50dvh,28rem)] lg:max-h-[calc(92dvh-14rem)]`;

/** Colonna form default — flusso naturale, scroll solo sul corpo modale. */
export const CAPTURE_REVIEW_FORM_COLUMN_CLASS = "min-w-0";

/** Altezza pannelli split quando il corpo modale non scrolla (compile capture). */
export const CAPTURE_REVIEW_PANEL_HEIGHT_CLASS = "lg:max-h-[calc(92dvh-14rem)]";

export function CaptureReviewSplitLayout({
  preview,
  review,
  busyOverlay,
  className = "",
  variant = "default",
}: {
  preview: ReactNode;
  review: ReactNode;
  busyOverlay?: ReactNode;
  className?: string;
  /** `panel`: scroll per colonna (PDF sx, form dx), corpo modale bloccato. */
  variant?: "default" | "panel";
}) {
  if (variant === "panel") {
    return (
      <div
        className={`relative grid min-h-0 min-w-0 flex-1 gap-4 max-lg:grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch ${CAPTURE_REVIEW_PANEL_HEIGHT_CLASS} ${className}`.trim()}
      >
        {busyOverlay}
        <div className={`${CAPTURE_REVIEW_PANEL_SCROLL_CLASS} min-w-0 max-w-full overflow-x-hidden max-lg:max-h-[min(50dvh,28rem)]`}>{preview}</div>
        <div className={`${CAPTURE_REVIEW_PANEL_SCROLL_CLASS} min-w-0 max-w-full overflow-x-hidden`}>{review}</div>
      </div>
    );
  }

  return (
    <div
      className={`relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start ${className}`.trim()}
    >
      {busyOverlay}
      <div className={`min-w-0 max-w-full overflow-x-hidden lg:sticky ${CAPTURE_REVIEW_PIN_TOP_CLASS} lg:z-[1] lg:self-start`}>{preview}</div>
      <div className={`${CAPTURE_REVIEW_FORM_COLUMN_CLASS} max-w-full overflow-x-hidden`}>{review}</div>
    </div>
  );
}

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
    <section className={`${dsHubModalSection} flex min-h-[14rem] min-w-0 max-w-full flex-col overflow-x-hidden space-y-2 p-3 ${className}`.trim()}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-[color:var(--cab-fg)]">{title}</h3>
        {action}
      </div>
      <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden">{children}</div>
    </section>
  );
}

function CaptureReviewPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2.5" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`h-10 rounded-[var(--ds-radius-md)] ${dsSkeletonPulse}`}
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
  progressState,
}: {
  title: string;
  message: string;
  skeleton?: "fields" | "preview";
  /** Stato pipeline reale — barra + messaggio allineati alla fase corrente. */
  progressState?: CaptureAcquisitionProgressState | null;
}) {
  return (
    <CaptureReviewPanelFrame title={title}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 min-w-0" role="status">
        {progressState?.active ? (
          <CaptureStatusProgress state={progressState} />
        ) : (
          <>
            <p className="text-center text-sm text-[color:var(--cab-muted-fg)]">{message}</p>
            {skeleton === "preview" ? (
              <div
                className={`mt-1 w-full max-w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] ${dsSkeletonPulse}`}
                style={{ aspectRatio: "210 / 297", maxHeight: "min(28rem, 50vh)" }}
                aria-hidden
              />
            ) : (
              <CaptureReviewPanelSkeleton />
            )}
          </>
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
      <div className="flex flex-1 flex-col justify-center gap-2 py-6 text-sm min-w-0">
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
