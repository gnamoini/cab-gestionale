"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { monthKeyFromYmd } from "@/lib/report/date-ranges";
import { LoadingCardSkeleton, LoadingErrorState } from "@/components/design-system";
import { Drawer } from "@/components/design-system";
import { CalendarAnalyticsPanel } from "@/components/dashboard/calendar-v2/calendar-analytics-panel";
import { CalendarV2Grid } from "@/components/dashboard/calendar-v2/calendar-v2-grid";
import type { CalendarSelection, CalendarViewMode } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import { useCalendarAnalytics } from "@/src/hooks/use-calendar-analytics";
import { useRbac } from "@/src/hooks/use-rbac";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import {
  dsDashboardWidgetTitle,
  dsSurfacePanelStatic,
  dsTypoCaption,
} from "@/lib/ui/design-system";

const DashboardPromemoriaSection = dynamic(
  () =>
    import("@/components/dashboard/promemoria/dashboard-promemoria-section").then(
      (m) => m.DashboardPromemoriaSection,
    ),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);

function initialMonthKey(): string {
  const ymd = todayDateYmd();
  return monthKeyFromYmd(ymd) ?? ymd.slice(0, 7);
}

export function CalendarV2Section() {
  const rbac = useRbac();
  const canReport = rbac.canReadPage("report");
  const canUseAi = canReport;

  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selection, setSelection] = useState<CalendarSelection>(() => ({ mode: "day", ymd: todayDateYmd() }));
  const [promemoriaOpen, setPromemoriaOpen] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const analytics = useCalendarAnalytics(monthKey, selection);
  const { live, derivedBundle, serviceInput, hasDataByDate, daySummary, weekSummary, dayEvents, isLoading, isError, isPanelLoading } =
    analytics;

  if (!isLoading && !isError) {
    hasLoadedOnceRef.current = true;
  }

  const isMonthLoading = hasLoadedOnceRef.current && live.integrityView.isFetching;
  const showInitialSkeleton = isLoading && !hasLoadedOnceRef.current;

  const handleSelectDay = useCallback((ymd: string) => {
    setSelection({ mode: "day", ymd });
    const mk = monthKeyFromYmd(ymd);
    if (mk) setMonthKey(mk);
  }, []);

  const handleSelectWeek = useCallback((weekStartYmd: string, weekEndYmd: string) => {
    setSelection({ mode: "week", weekStartYmd, weekEndYmd });
    const mk = monthKeyFromYmd(weekStartYmd);
    if (mk) setMonthKey(mk);
  }, []);

  const handleGoToday = useCallback(() => {
    const ymd = todayDateYmd();
    handleSelectDay(ymd);
  }, [handleSelectDay]);

  const handleMonthKeyChange = useCallback((mk: string) => {
    setMonthKey(mk);
  }, []);

  const panelBody = useMemo(() => {
    if (isError && !isLoading) {
      return (
        <LoadingErrorState
          title="Calendario non disponibile"
          description="Verifica la connessione e riprova."
          onRetry={() => window.location.reload()}
        />
      );
    }
    if (showInitialSkeleton) {
      return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
    }
    return (
      <div
        data-testid="calendar-v2-grid"
        className="grid min-w-0 gap-5 cab-shell-desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] cab-shell-desktop:items-start"
      >
        <div className={`${dsSurfacePanelStatic} min-w-0 p-4 sm:p-5`}>
          <CalendarV2Grid
            monthKey={monthKey}
            onMonthKeyChange={handleMonthKeyChange}
            selection={selection}
            onSelectDay={handleSelectDay}
            onSelectWeek={handleSelectWeek}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasDataByDate={hasDataByDate}
            isLoading={isMonthLoading}
            onGoToday={handleGoToday}
          />
        </div>
        <CalendarAnalyticsPanel
          selection={selection}
          daySummary={daySummary}
          weekSummary={weekSummary}
          dayEvents={dayEvents}
          serviceInput={serviceInput}
          derivedBundle={derivedBundle}
          snapshotFingerprint={live.snapshotFingerprint}
          integrityView={live.integrityView}
          isLoading={isPanelLoading}
          canReport={canReport}
          canUseAi={canUseAi}
        />
      </div>
    );
  }, [
    canReport,
    canUseAi,
    dayEvents,
    daySummary,
    derivedBundle,
    handleGoToday,
    handleMonthKeyChange,
    handleSelectDay,
    handleSelectWeek,
    hasDataByDate,
    isError,
    isLoading,
    isMonthLoading,
    isPanelLoading,
    live.integrityView,
    live.snapshotFingerprint,
    monthKey,
    selection,
    serviceInput,
    showInitialSkeleton,
    viewMode,
    weekSummary,
  ]);

  return (
    <>
      <section aria-label="Calendario operativo" className={`${dsSurfacePanelStatic} min-w-0 max-w-full p-4 sm:p-5`}>
        <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`${dsDashboardWidgetTitle} min-w-0`}>Calendario operativo</h2>
            <p className={`mt-1 max-w-2xl ${dsTypoCaption}`}>
              Seleziona un giorno o una settimana per esplorare ingressi, uscite e insight nel pannello analisi.
            </p>
          </div>
          <button type="button" className={erpBtnNeutral} onClick={() => setPromemoriaOpen(true)}>
            Promemoria
          </button>
        </div>
        {panelBody}
      </section>

      <Drawer
        open={promemoriaOpen}
        onClose={() => setPromemoriaOpen(false)}
        title="Promemoria"
        ariaLabel="Promemoria dashboard"
      >
        <div className="min-h-0 overflow-y-auto p-1">
          <DashboardPromemoriaSection />
        </div>
      </Drawer>
    </>
  );
}
