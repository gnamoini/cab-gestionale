"use client";

import { resolveReportV2InsightsEnabled } from "@/lib/feature-flags/report-v2-flag";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { InsightStrip } from "@/components/report/insight-strip/InsightStrip";
import { useReportInsights } from "@/components/report/insight-strip/hooks/use-report-insights";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import { ShellCard } from "@/components/gestionale/shell-card";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";

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
      <ShellCard
        title="Insight"
        subtitle="Segnali analitici"
        collapsible
        defaultCollapsed={false}
        persistScope="report"
        persistKey="insight"
        className={reportZoneShellClass}
      >
        <ReportV2InsightContent range={range} compareMode={compareMode} />
      </ShellCard>
    </GestionaleClientErrorBoundary>
  );
}
