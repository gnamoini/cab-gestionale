"use client";

import { LoadingCardSkeleton, LoadingErrorState } from "@/components/design-system";
import { CalendarV2Actions } from "@/components/dashboard/calendar-v2/calendar-v2-actions";
import { CalendarV2InsightsBlock } from "@/components/dashboard/calendar-v2/calendar-v2-insights";
import { CalendarV2KpiCards } from "@/components/dashboard/calendar-v2/calendar-v2-kpi-cards";
import type { CalendarEventRow } from "@/lib/report/calendar-report-service";
import type { CalendarDaySummary } from "@/lib/report/calendar-report-service";
import type { CalendarReportServiceInput } from "@/lib/report/calendar-report-service";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import { getDayInsights } from "@/lib/report/calendar-report-service";
import { dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";

function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EventList({ events }: { events: CalendarEventRow[] }) {
  if (events.length === 0) {
    return <p className={`${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>Nessun evento significativo.</p>;
  }
  return (
    <ul className="min-w-0 space-y-1.5">
      {events.map((ev) => (
        <li
          key={ev.id}
          className="min-w-0 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2.5 py-2"
        >
          <p className={`${dsTypoSmall} font-medium text-[color:var(--cab-text)]`}>
            {ev.eventDomain === "lifecycle" ? (
              <span className="mr-1.5 inline-block rounded bg-[color:var(--cab-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-accent)]">
                Lifecycle
              </span>
            ) : ev.eventDomain === "operational" ? (
              <span className="mr-1.5 inline-block rounded bg-[color:var(--cab-surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                Officina
              </span>
            ) : null}
            {ev.label}
          </p>
          {ev.detail ? (
            <p className={`mt-0.5 ${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>{ev.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CalendarDayAnalyticsPanel({
  ymd,
  summary,
  events,
  selection,
  serviceInput,
  derivedBundle,
  snapshotFingerprint,
  integrityView,
  isLoading,
  canReport,
  canUseAi,
}: {
  ymd: string;
  summary: CalendarDaySummary | null;
  events: CalendarEventRow[];
  selection: CalendarSelection;
  serviceInput: CalendarReportServiceInput;
  derivedBundle: ReportDerivedBundle;
  snapshotFingerprint: string;
  integrityView: ReportIntegrityBadgeView;
  isLoading: boolean;
  canReport: boolean;
  canUseAi: boolean;
}) {
  const deterministic = getDayInsights(serviceInput, ymd).insights;

  if (isLoading && !summary) {
    return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
  }

  if (!summary) {
    return (
      <LoadingErrorState
        title="Analisi non disponibile"
        description="Impossibile calcolare i dati per il giorno selezionato."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="min-w-0">
        <h3 className="text-base font-semibold capitalize text-[color:var(--cab-text)]">{formatDayHeading(ymd)}</h3>
      </header>
      <CalendarV2KpiCards summary={summary} />
      <section className="min-w-0 space-y-2" aria-labelledby="calendar-day-events">
        <h4 id="calendar-day-events" className={`${dsTypoSmall} font-semibold text-[color:var(--cab-text)]`}>
          Eventi
        </h4>
        <EventList events={events} />
      </section>
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
