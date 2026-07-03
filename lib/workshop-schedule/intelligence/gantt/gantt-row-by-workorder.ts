import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

export type GanttBar = {
  sessionId: string;
  startAt: string;
  endAt: string;
  title: string;
  planningStatus: string;
  hasOverlap: boolean;
};

export type GanttRow = {
  workOrderId: string | null;
  label: string;
  sessions: GanttBar[];
  earliestStart: string;
};

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function markOverlappingBars(bars: GanttBar[]): GanttBar[] {
  const sorted = [...bars].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const overlapIds = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const aStart = Date.parse(sorted[i].startAt);
    const aEnd = Date.parse(sorted[i].endAt);
    for (let j = i + 1; j < sorted.length; j++) {
      const bStart = Date.parse(sorted[j].startAt);
      const bEnd = Date.parse(sorted[j].endAt);
      if (bStart >= aEnd) break;
      if (rangesOverlap(aStart, aEnd, bStart, bEnd)) {
        overlapIds.add(sorted[i].sessionId);
        overlapIds.add(sorted[j].sessionId);
      }
    }
  }

  return bars.map((b) => ({ ...b, hasOverlap: overlapIds.has(b.sessionId) }));
}

function rowLabel(session: WorkshopScheduleSessionView): string {
  if (session.workOrder) {
    const codice = session.workOrder.codice ?? session.workOrderId;
    const cliente = session.workOrder.cliente;
    return cliente ? `${codice} — ${cliente}` : String(codice);
  }
  return session.workOrderId ? `WO ${session.workOrderId.slice(0, 8)}` : "Senza lavorazione";
}

export function buildGanttRowsByWorkOrder(sessions: readonly WorkshopScheduleSessionView[]): GanttRow[] {
  const byWo = new Map<string | null, WorkshopScheduleSessionView[]>();

  for (const s of sessions) {
    if (s.planningStatus === "cancelled") continue;
    const key = s.workOrderId;
    const list = byWo.get(key) ?? [];
    list.push(s);
    byWo.set(key, list);
  }

  const rows: GanttRow[] = [];

  for (const [workOrderId, group] of byWo) {
    const sorted = [...group].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const bars: GanttBar[] = sorted.map((s) => ({
      sessionId: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      title: s.title,
      planningStatus: s.planningStatus,
      hasOverlap: false,
    }));
    rows.push({
      workOrderId,
      label: rowLabel(sorted[0]),
      sessions: markOverlappingBars(bars),
      earliestStart: sorted[0]?.startAt ?? "",
    });
  }

  return rows.sort((a, b) => a.earliestStart.localeCompare(b.earliestStart) || a.label.localeCompare(b.label));
}
