"use client";

import { resolveReportV2ExecutiveEnabled } from "@/lib/feature-flags/report-v2-flag";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { ReportExecutiveRow } from "@/components/report/executive/ReportExecutiveRow";
import { useReportExecutive } from "@/components/report/executive/hooks/use-report-executive";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import { ShellCard } from "@/components/gestionale/shell-card";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";

function ReportV2ExecutiveContent({
  range,
  compareMode,
}: {
  range: DateRange;
  compareMode: ReportCompareMode;
}) {
  const { cards, loading, error } = useReportExecutive(range, compareMode);
  return <ReportExecutiveRow cards={cards} loading={loading} error={error} />;
}

export function ReportV2ExecutiveBoundary({
  range,
  compareMode,
  embedded = false,
}: {
  range: DateRange | null;
  compareMode: ReportCompareMode;
  /** When true, skip inner ShellCard (parent provides section shell). */
  embedded?: boolean;
}) {
  if (!resolveReportV2ExecutiveEnabled() || !range) {
    return null;
  }

  const content = <ReportV2ExecutiveContent range={range} compareMode={compareMode} />;

  if (embedded) {
    return <GestionaleClientErrorBoundary>{content}</GestionaleClientErrorBoundary>;
  }

  return (
    <GestionaleClientErrorBoundary>
      <ShellCard
        title="Executive"
        subtitle="KPI cross-dominio"
        collapsible
        defaultCollapsed={false}
        persistScope="report"
        persistKey="executive"
        className={reportZoneShellClass}
      >
        {content}
      </ShellCard>
    </GestionaleClientErrorBoundary>
  );
}
