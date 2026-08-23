"use client";

import { resolveReportV2InsightsEnabled } from "@/lib/feature-flags/report-v2-flag";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { InsightStrip } from "@/components/report/insight-strip/InsightStrip";
import { useReportInsights } from "@/components/report/insight-strip/hooks/use-report-insights";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";

function ReportV2InsightContent({
  range,
  compareMode,
}: {
  range: DateRange;
  compareMode: ReportCompareMode;
}) {
  const { insights, loading, error } = useReportInsights(range, compareMode);
  return <InsightStrip insights={insights} loading={loading} error={error} />;
}

export { ReportV2InsightContent };

export function ReportV2InsightBoundary({
  range,
  compareMode,
}: {
  range: DateRange | null;
  compareMode: ReportCompareMode;
}) {
  if (!resolveReportV2InsightsEnabled() || !range) {
    return null;
  }

  return (
    <GestionaleClientErrorBoundary>
      <ReportAnalysisSectionShell
        title="Insight"
        subtitle="Segnali analitici del periodo — cosa meritano attenzione"
        persistKey="insight"
      >
        <ReportV2InsightContent range={range} compareMode={compareMode} />
      </ReportAnalysisSectionShell>
    </GestionaleClientErrorBoundary>
  );
}
