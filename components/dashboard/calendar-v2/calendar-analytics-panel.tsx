"use client";

import { CalendarDayAnalyticsPanel } from "@/components/dashboard/calendar-v2/calendar-day-analytics-panel";
import { CalendarWeekAnalyticsPanel } from "@/components/dashboard/calendar-v2/calendar-week-analytics-panel";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import type { CalendarReportServiceInput } from "@/lib/report/calendar-report-service";
import type {
  CalendarDaySummary,
  CalendarEventRow,
  CalendarWeekSummary,
} from "@/lib/report/calendar-report-service";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import { dsSurfacePanelStatic } from "@/lib/ui/design-system";

export function CalendarAnalyticsPanel({
  selection,
  daySummary,
  weekSummary,
  dayEvents,
  serviceInput,
  derivedBundle,
  snapshotFingerprint,
  integrityView,
  isLoading,
  canReport,
  canUseAi,
}: {
  selection: CalendarSelection;
  daySummary: CalendarDaySummary | null;
  weekSummary: CalendarWeekSummary | null;
  dayEvents: CalendarEventRow[];
  serviceInput: CalendarReportServiceInput;
  derivedBundle: ReportDerivedBundle;
  snapshotFingerprint: string;
  integrityView: ReportIntegrityBadgeView;
  isLoading: boolean;
  canReport: boolean;
  canUseAi: boolean;
}) {
  return (
    <aside
      aria-label="Pannello analisi calendario"
      className={`${dsSurfacePanelStatic} min-w-0 max-w-full p-4 sm:p-5`}
    >
      {selection.mode === "day" ? (
        <CalendarDayAnalyticsPanel
          ymd={selection.ymd}
          summary={daySummary}
          events={dayEvents}
          selection={selection}
          serviceInput={serviceInput}
          derivedBundle={derivedBundle}
          snapshotFingerprint={snapshotFingerprint}
          integrityView={integrityView}
          isLoading={isLoading}
          canReport={canReport}
          canUseAi={canUseAi}
        />
      ) : (
        <CalendarWeekAnalyticsPanel
          summary={weekSummary}
          selection={selection}
          serviceInput={serviceInput}
          derivedBundle={derivedBundle}
          snapshotFingerprint={snapshotFingerprint}
          integrityView={integrityView}
          isLoading={isLoading}
          canReport={canReport}
          canUseAi={canUseAi}
        />
      )}
    </aside>
  );
}
