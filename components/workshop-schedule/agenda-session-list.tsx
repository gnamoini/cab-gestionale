"use client";

import { useMemo } from "react";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { AgendaSessionBlock } from "@/components/workshop-schedule/agenda-session-block";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import {
  dsAccentRowHighlight,
  dsBadgeNeutral,
  dsSectionTitle,
  dsSurfacePanelStatic,
  dsTypoCaption,
} from "@/lib/ui/design-system";

export function sortAgendaSessions(sessions: readonly WorkshopScheduleSessionView[]): WorkshopScheduleSessionView[] {
  return [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function agendaDayHeading(ymd: string, opts?: { weekday?: boolean }): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: opts?.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
  });
}

export function AgendaListEmpty({ message }: { message: string }) {
  return (
    <p
      className={`${dsTypoCaption} rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-3 py-4 text-center`}
    >
      {message}
    </p>
  );
}

export function AgendaSessionList({
  sessions,
  selectedId,
  onSelect,
  emptyMessage = "Nessuna sessione.",
  compact = false,
  scrollable = false,
  className = "",
}: {
  sessions: readonly WorkshopScheduleSessionView[];
  selectedId?: string | null;
  onSelect?: (session: WorkshopScheduleSessionView) => void;
  emptyMessage?: string;
  compact?: boolean;
  scrollable?: boolean;
  className?: string;
}) {
  const sorted = useMemo(() => sortAgendaSessions(sessions), [sessions]);

  if (sorted.length === 0) {
    return <AgendaListEmpty message={emptyMessage} />;
  }

  return (
    <ul
      className={`m-0 list-none space-y-1.5 p-0 ${scrollable ? "gestionale-scrollbar max-h-[min(28rem,55vh)] overflow-y-auto pr-0.5" : ""} ${className}`.trim()}
      aria-label="Elenco sessioni"
    >
      {sorted.map((session) => (
        <li key={session.id}>
          <AgendaSessionBlock
            session={session}
            compact={compact}
            selected={selectedId === session.id}
            onClick={() => onSelect?.(session)}
          />
        </li>
      ))}
    </ul>
  );
}

export function AgendaSessionGroupedList({
  sessions,
  selectedId,
  onSelect,
  emptyMessage = "Nessuna sessione nel periodo.",
}: {
  sessions: readonly WorkshopScheduleSessionView[];
  selectedId?: string | null;
  onSelect?: (session: WorkshopScheduleSessionView) => void;
  emptyMessage?: string;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, WorkshopScheduleSessionView[]>();
    for (const s of sortAgendaSessions(sessions)) {
      const ymd = ymdFromIso(s.startAt);
      map.set(ymd, [...(map.get(ymd) ?? []), s]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  if (groups.length === 0) {
    return <AgendaListEmpty message={emptyMessage} />;
  }

  return (
    <div className="gestionale-scrollbar max-h-[min(32rem,60vh)] space-y-3 overflow-y-auto pr-0.5">
      {groups.map(([ymd, items]) => (
        <section key={ymd} aria-label={agendaDayHeading(ymd, { weekday: true })}>
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <p className={`${dsSectionTitle} capitalize`}>{agendaDayHeading(ymd, { weekday: true })}</p>
            <span className={dsBadgeNeutral}>{items.length}</span>
          </div>
          <AgendaSessionList sessions={items} selectedId={selectedId} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}

export function AgendaWeekDayColumn({
  ymd,
  sessions,
  selectedId,
  isToday = false,
  onSelect,
}: {
  ymd: string;
  sessions: readonly WorkshopScheduleSessionView[];
  selectedId?: string | null;
  isToday?: boolean;
  onSelect?: (session: WorkshopScheduleSessionView) => void;
}) {
  const sorted = useMemo(() => sortAgendaSessions(sessions), [sessions]);

  return (
    <div
      className={`${dsSurfacePanelStatic} min-h-0 gap-2 p-2.5 ${isToday ? dsAccentRowHighlight : ""}`}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className={`${dsSectionTitle} capitalize`}>{agendaDayHeading(ymd, { weekday: true })}</p>
        <span className={dsBadgeNeutral}>{sorted.length}</span>
      </div>
      {isToday ? (
        <p className={`px-0.5 ${dsTypoCaption}`}>Oggi</p>
      ) : null}
      <AgendaSessionList
        sessions={sorted}
        selectedId={selectedId}
        onSelect={onSelect}
        compact
        emptyMessage="Nessuna sessione"
      />
    </div>
  );
}
