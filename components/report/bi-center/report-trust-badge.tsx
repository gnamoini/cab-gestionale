"use client";

import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

const LABELS: Record<ReportMetricEnvelopeTrust, string> = {
  verified: "Verificato",
  estimated: "Stimato",
  partial: "Parziale",
  not_available: "Non disponibile",
};

const GLYPH: Record<ReportMetricEnvelopeTrust, string> = {
  verified: "✓",
  estimated: "≈",
  partial: "!",
  not_available: "—",
};

export function ReportTrustBadge({
  trust,
  compact = false,
}: {
  trust: ReportMetricEnvelopeTrust;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--cab-border)] text-[10px] font-semibold text-[color:var(--cab-text-muted)]"
        title={LABELS[trust]}
        aria-label={LABELS[trust]}
      >
        {GLYPH[trust]}
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--cab-border)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--cab-text-muted)]"
      title={LABELS[trust]}
      aria-label={LABELS[trust]}
    >
      <span aria-hidden>{GLYPH[trust]}</span>
      <span className="hidden sm:inline">{LABELS[trust]}</span>
    </span>
  );
}
