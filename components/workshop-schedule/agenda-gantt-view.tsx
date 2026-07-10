"use client";

import { Tooltip } from "@/components/ui";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GanttRow } from "@/lib/workshop-schedule/intelligence/gantt/gantt-row-by-workorder";
import type { GanttTimeAxis } from "@/lib/workshop-schedule/intelligence/gantt/gantt-time-axis";
import { sessionToBarOffsets } from "@/lib/workshop-schedule/intelligence/gantt/gantt-time-axis";
import { localTimeLabel } from "@/lib/workshop-schedule/datetime";
import { AgendaListEmpty } from "@/components/workshop-schedule/agenda-session-list";
import { dsScrollbar, dsSectionTitle, dsSurfacePanelStatic, dsTypoCaption } from "@/lib/ui/design-system";

export function AgendaGanttView({
  rows,
  axis,
  selectedSessionId,
  onSelectSession,
}: {
  rows: GanttRow[];
  axis: GanttTimeAxis;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 6,
  });

  return (
    <div className={`${dsSurfacePanelStatic} min-h-0 gap-0 overflow-hidden p-0`}>
      <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
        <p className={dsSectionTitle}>Gantt lavorazioni</p>
        <p className={`mt-0.5 ${dsTypoCaption}`}>Timeline per lavorazione — sola consultazione</p>
      </div>
      <div className="relative h-8 border-b border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]">
        {axis.dayTicks.map((tick) => (
          <span
            key={tick.ymd}
            className="absolute top-1 -translate-x-1/2 text-[10px] font-semibold text-[color:var(--cab-text-muted)]"
            style={{ left: `${tick.offsetPct}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div ref={parentRef} className={`max-h-[min(28rem,60vh)] overflow-auto ${dsScrollbar}`}>
        {rows.length === 0 ? (
          <div className="p-3">
            <AgendaListEmpty message="Nessuna sessione nel periodo." />
          </div>
        ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            return (
              <div
                key={row.workOrderId ?? `row-${vi.index}`}
                className="absolute left-0 flex w-full items-center gap-2 border-b border-[color:var(--cab-border)] px-2"
                style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
              >
                <Tooltip content={row.label}><div className="w-36 shrink-0 truncate text-xs font-medium text-[color:var(--cab-text)]">
                  {row.label}
                </div></Tooltip>
                <div className="relative h-7 min-w-0 flex-1 rounded bg-[var(--cab-surface-2)]">
                  {row.sessions.map((bar) => {
                    const { leftPct, widthPct } = sessionToBarOffsets(bar.startAt, bar.endAt, axis);
                    const selected = selectedSessionId === bar.sessionId;
                    return (
                      <Tooltip content={`${bar.title} · ${localTimeLabel(bar.startAt)}–${localTimeLabel(bar.endAt)}`}><button key={bar.sessionId} type="button" className={`absolute top-0.5 h-6 rounded text-[10px] font-semibold text-white ${bar.hasOverlap ? "ring-2 ring-red-500" : ""} ${selected ? "ring-2 ring-[color:var(--cab-primary)]" : ""} ${bar.planningStatus === "cancelled"
        ? "bg-zinc-400"
        : bar.hasOverlap
            ? "bg-red-500/90"
            : "bg-blue-500/85"}`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} onClick={() => onSelectSession?.(bar.sessionId)}>
                        <span className="block truncate px-1">{bar.title}</span>
                      </button></Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
      <p className={`px-3 py-2 ${dsTypoCaption}`}>Clic su una barra per evidenziare la sessione.</p>
    </div>
  );
}
