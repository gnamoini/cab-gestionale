"use client";

import { useMemo, useState } from "react";
import { useReportOperationalContextTimelineQuery } from "@/components/report/operational-context/use-report-operational-context-query";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportTimelineFilters } from "@/components/report/bi-center/operational/report-timeline-filters";
import { ReportTimelineEventCard } from "@/components/report/bi-center/operational/report-timeline-event-card";
import { getReportSectionCopy } from "@/lib/report/ui/report-business-labels";
import type { OperationalTimelineFilter, ReportOperationalEvent } from "@/lib/report/operational-context/types";

function groupByDay(events: ReportOperationalEvent[]): Map<string, ReportOperationalEvent[]> {
  const map = new Map<string, ReportOperationalEvent[]>();
  for (const e of events) {
    const day = e.timestamp.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(e);
    map.set(day, list);
  }
  return map;
}

function matchesFilter(event: ReportOperationalEvent, filter: OperationalTimelineFilter): boolean {
  if (filter === "all") return true;
  if (filter === "notes") return event.type === "diary";
  if (filter === "insight") return event.type === "insight";
  if (filter === "economic") return event.type === "economic" || event.filterCategory === "economic";
  if (filter === "warehouse") return event.type === "inventory" || event.filterCategory === "warehouse";
  if (filter === "commercial") return event.type === "commercial";
  if (filter === "operational") return event.type === "work_order" || event.type === "system";
  return true;
}

export function ReportTimelineV2() {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<OperationalTimelineFilter>("all");
  const { data, isLoading, isError } = useReportOperationalContextTimelineQuery(expanded);

  const filtered = useMemo(() => {
    const events = data?.timelineEvents ?? [];
    return events.filter((e) => matchesFilter(e, filter));
  }, [data?.timelineEvents, filter]);

  const byDay = useMemo(() => groupByDay(filtered), [filtered]);

  const timelineCopy = getReportSectionCopy("timeline");

  return (
    <div id="report-timeline-v2">
      <ReportAnalysisSectionShell
        title={timelineCopy.title}
        subtitle={timelineCopy.subtitle}
        persistKey="bi-timeline-v2"
        defaultCollapsed
      >
        {!expanded ? (
          <button
            type="button"
            className="text-sm font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
            onClick={() => setExpanded(true)}
            data-testid="report-timeline-expand"
          >
            Carica timeline operativa
          </button>
        ) : isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento timeline…</p>
        ) : isError ? (
          <p className="text-sm text-[color:var(--cab-danger)]">Timeline non disponibile</p>
        ) : (
          <div className="space-y-4">
            <ReportTimelineFilters value={filter} onChange={setFilter} />
            {filtered.length === 0 ? (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun evento per il filtro selezionato</p>
            ) : (
              <div className="space-y-6">
                {[...byDay.entries()].map(([day, events]) => (
                  <section key={day} aria-label={`Eventi ${day}`}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                      {day}
                    </h3>
                    <ul className="space-y-3">
                      {events.map((event) => (
                        <ReportTimelineEventCard key={event.id} event={event} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </ReportAnalysisSectionShell>
    </div>
  );
}
