"use client";

import { REPORT_EMPTY_STATE_COPY } from "@/lib/report/ui/report-copy";

export type ReportChartEmptyReason =
  | "no_data"
  | "insufficient_points"
  | "no_history"
  | "not_applicable";

const REASON_MESSAGES: Record<ReportChartEmptyReason, string> = {
  no_data: REPORT_EMPTY_STATE_COPY.noData,
  insufficient_points: REPORT_EMPTY_STATE_COPY.insufficient,
  no_history: "Non c'è uno storico sufficiente per mostrare l'andamento.",
  not_applicable: "Questa visualizzazione non è applicabile ai dati disponibili.",
};

export function ReportChartEmptyState({
  reason = "insufficient_points",
  detail,
}: {
  reason?: ReportChartEmptyReason;
  detail?: string;
}) {
  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center rounded-[var(--ds-radius-xl)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_30%,var(--cab-card))] px-4 py-6 text-center"
      role="status"
    >
      <p className="text-sm text-[color:var(--cab-text-muted)]">{REASON_MESSAGES[reason]}</p>
      {detail ? <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">{detail}</p> : null}
    </div>
  );
}
