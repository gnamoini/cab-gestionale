"use client";

import { ReportDiaryEventCard } from "@/components/report/bi-center/operational/report-diary-event-card";
import { useOptionalReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

export function ReportTimelineEventCard({ event }: { event: ReportOperationalEvent }) {
  const drill = useOptionalReportDrillDown();

  if (event.type === "diary" || event.source.kind === "diary") {
    return <ReportDiaryEventCard event={event} />;
  }

  const openDrill = () => {
    if (event.drillDown && drill) drill.openInsightDrillDown(event.drillDown);
  };

  return (
    <li className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 shadow-[var(--cab-shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-[color:var(--cab-text)]">{event.title}</p>
        {event.severity === "attention" || event.severity === "negative" ? (
          <span className="text-xs text-[color:var(--cab-warning)]">Attenzione</span>
        ) : null}
      </div>
      {event.metricIds?.[0] ? (
        <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Metrica: {event.metricIds[0]}</p>
      ) : null}
      {event.drillDown ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium underline underline-offset-2"
          onClick={openDrill}
          data-testid="timeline-event-drilldown"
        >
          Visualizza metrica
        </button>
      ) : null}
    </li>
  );
}
