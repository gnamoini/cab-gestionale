"use client";

import type { CaptureReviewStateSummary } from "@/lib/document-capture/capture-review-state";

export function CaptureReviewWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul
      className="mb-3 list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-300"
      role="status"
      aria-label="Avvisi revisione"
    >
      {warnings.map((w) => (
        <li key={w}>{w}</li>
      ))}
    </ul>
  );
}

export function CaptureReviewStateBanner({ summary }: { summary: CaptureReviewStateSummary }) {
  if (!summary.message || summary.state === "ready") return null;

  const tone =
    summary.state === "blocked"
      ? "text-[color:var(--cab-danger)]"
      : summary.state === "partial_success" || summary.state === "needs_review"
        ? "text-amber-700 dark:text-amber-300"
        : "text-[color:var(--cab-text-muted)]";

  return (
    <p className={`text-xs ${tone}`} role="status" aria-live="polite">
      {summary.message}
    </p>
  );
}
