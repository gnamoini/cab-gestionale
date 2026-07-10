"use client";

import { useMemo, useRef } from "react";
import { Tooltip } from "@/components/ui";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { AgendaSessionBlock } from "@/components/workshop-schedule/agenda-session-block";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import { dsFocus, dsSectionTitle, dsSurfacePanelStatic, dsTypoCaption } from "@/lib/ui/design-system";

const SLOT_MINUTES = 30;
const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_HEIGHT = 28;

function minutesFromDayStart(iso: string, dayYmd: string): number {
  const d = new Date(iso);
  const local = new Date(`${dayYmd}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`);
  return (local.getHours() - START_HOUR) * 60 + local.getMinutes();
}

export function AgendaDayTimeline({
  dayYmd,
  sessions,
  selectedId,
  onSelect,
  onSlotClick,
}: {
  dayYmd: string;
  sessions: readonly WorkshopScheduleSessionView[];
  selectedId?: string | null;
  onSelect: (session: WorkshopScheduleSessionView) => void;
  onSlotClick?: (startIso: string, endIso: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const slotCount = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

  const daySessions = useMemo(
    () => sessions.filter((s) => ymdFromIso(s.startAt) === dayYmd || ymdFromIso(s.endAt) === dayYmd),
    [sessions, dayYmd],
  );

  const rowVirtualizer = useVirtualizer({
    count: slotCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SLOT_HEIGHT,
    overscan: 4,
  });

  const dayLabel = new Date(`${dayYmd}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className={`${dsSurfacePanelStatic} min-h-[320px] min-w-0 flex-1 overflow-hidden p-0`}>
      <div className="border-b border-[color:var(--cab-border)] px-3 py-2.5">
        <p className={dsSectionTitle}>Timeline</p>
        <p className={`mt-0.5 capitalize ${dsTypoCaption}`}>{dayLabel}</p>
      </div>
      <div ref={parentRef} className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-2" style={{ maxHeight: "min(70vh, 640px)" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const slotMin = vi.index * SLOT_MINUTES;
            const hour = START_HOUR + Math.floor(slotMin / 60);
            const min = slotMin % 60;
            const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
            const slotBtn = (
              <button
                key={vi.key}
                type="button"
                className={`absolute left-0 right-0 border-t border-dashed border-[color:color-mix(in_srgb,var(--cab-border)_70%,transparent)] text-left text-[10px] text-[color:var(--cab-text-muted)] transition-colors hover:bg-[var(--cab-hover)] ${dsFocus}`}
                style={{ top: vi.start, height: vi.size, paddingLeft: 4 }}
                onClick={() => {
                  if (!onSlotClick) return;
                  const start = new Date(`${dayYmd}T${label}:00`);
                  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
                  onSlotClick(start.toISOString(), end.toISOString());
                }}
              >
                {min === 0 ? <span className="font-semibold tabular-nums">{label}</span> : null}
              </button>
            );
            return onSlotClick && min === 0 ? (
              <Tooltip key={vi.key} content={`Crea sessione alle ${label}`}>
                {slotBtn}
              </Tooltip>
            ) : (
              slotBtn
            );
          })}
          {daySessions.map((session) => {
            const topMin = Math.max(0, minutesFromDayStart(session.startAt, dayYmd));
            const endMin = minutesFromDayStart(session.endAt, dayYmd);
            const heightMin = Math.max(SLOT_MINUTES / 2, endMin - topMin);
            const top = (topMin / SLOT_MINUTES) * SLOT_HEIGHT;
            const height = (heightMin / SLOT_MINUTES) * SLOT_HEIGHT;
            return (
              <div key={session.id} className="absolute left-12 right-1 z-10" style={{ top, height: Math.max(height, SLOT_HEIGHT - 4) }}>
                <AgendaSessionBlock
                  session={session}
                  compact
                  selected={selectedId === session.id}
                  onClick={() => onSelect(session)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
