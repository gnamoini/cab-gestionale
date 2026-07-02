"use client";

import { LoadingCardSkeleton, LoadingErrorState } from "@/components/design-system";
import { CalendarV2Actions } from "@/components/dashboard/calendar-v2/calendar-v2-actions";
import { CalendarV2InsightsBlock } from "@/components/dashboard/calendar-v2/calendar-v2-insights";
import { CalendarV2WeekKpiCards } from "@/components/dashboard/calendar-v2/calendar-v2-kpi-cards";
import type { CalendarWeekSummary } from "@/lib/report/calendar-report-service";
import { getWeekInsights, weekRangeLabel } from "@/lib/report/calendar-report-service";
import type { CalendarReportServiceInput } from "@/lib/report/calendar-report-service";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import { dsTypoSmall } from "@/lib/ui/design-system";

export function CalendarWeekAnalyticsPanel({
  summary,
  selection,
  serviceInput,
  derivedBundle,
  snapshotFingerprint,
  integrityView,
  isLoading,
  canReport,
  canUseAi,
}: {
  summary: CalendarWeekSummary | null;
  selection: CalendarSelection;
  serviceInput: CalendarReportServiceInput;
  derivedBundle: ReportDerivedBundle;
  snapshotFingerprint: string;
  integrityView: ReportIntegrityBadgeView;
  isLoading: boolean;
  canReport: boolean;
  canUseAi: boolean;
}) {
  if (isLoading && !summary) {
    return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
  }

  if (!summary || selection.mode !== "week") {
    return (
      <LoadingErrorState
        title="Analisi non disponibile"
        description="Impossibile calcolare i dati per la settimana selezionata."
      />
    );
  }

  const deterministic = getWeekInsights(serviceInput, selection.weekStartYmd).insights;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="min-w-0">
        <h3 className="text-base font-semibold text-[color:var(--cab-text)]">Settimana</h3>
        <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
          {weekRangeLabel(summary.weekStart, summary.weekEnd)}
        </p>
      </header>
      <CalendarV2WeekKpiCards
        entriesCount={summary.entriesCount}
        exitsCount={summary.exitsCount}
        entriesTrendPct={summary.entriesTrendPct}
        exitsTrendPct={summary.exitsTrendPct}
        anomaliesCount={summary.anomaliesCount}
      />
      <CalendarV2InsightsBlock
        selection={selection}
        serviceInput={serviceInput}
        derivedBundle={derivedBundle}
        snapshotFingerprint={snapshotFingerprint}
        integrityView={integrityView}
        deterministicInsights={deterministic}
        canUseAi={canUseAi}
      />
      <CalendarV2Actions selection={selection} canReport={canReport} />
    </div>
  );
}
