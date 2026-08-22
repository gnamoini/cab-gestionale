"use client";

import { useReportAsk } from "@/components/report/ask-report/report-ask-provider";
import { useOptionalReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";

export function ReportAskCitation({
  citation,
}: {
  citation: import("@/lib/report/ask-report/types").AskReportCitation;
}) {
  const drill = useOptionalReportDrillDown();
  const periodCtx = useReportPeriodContext();

  const onClick = () => {
    if (!drill) return;
    if (citation.drillDownContext) {
      drill.openKpiDrillDown(citation.drillDownContext);
      return;
    }
    if (citation.metricId && drill.isDrilldownSupported(citation.metricId)) {
      drill.openKpiDrillDown({
        metricId: citation.metricId,
        period: buildAnalyticsPeriodFromContext(periodCtx),
        compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
      });
    }
  };

  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--cab-text)] transition hover:border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] hover:bg-[color:var(--cab-surface-muted)]"
      onClick={onClick}
      data-testid="report-ask-citation"
      title={citation.label}
    >
      <span className="truncate">{citation.label}</span>
      <span className="text-[color:var(--cab-primary)]" aria-hidden>
        →
      </span>
    </button>
  );
}
