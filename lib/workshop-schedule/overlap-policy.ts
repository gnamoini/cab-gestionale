import type { WorkshopScheduleConflict, WorkshopScheduleSession } from "@/lib/workshop-schedule/types";

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function classifyOverlap(
  candidate: Pick<WorkshopScheduleSession, "startAt" | "endAt" | "workOrderId" | "eventType">,
  existing: Pick<WorkshopScheduleSession, "id" | "startAt" | "endAt" | "workOrderId" | "eventType" | "title" | "planningStatus">,
): WorkshopScheduleConflict | null {
  if (existing.planningStatus === "cancelled") return null;
  const cStart = Date.parse(candidate.startAt);
  const cEnd = Date.parse(candidate.endAt);
  const eStart = Date.parse(existing.startAt);
  const eEnd = Date.parse(existing.endAt);
  if (!rangesOverlap(cStart, cEnd, eStart, eEnd)) return null;

  if (existing.eventType === "blocco_agenda" || candidate.eventType === "blocco_agenda") {
    return {
      eventId: existing.id,
      conflictType: "block",
      title: existing.title,
      startAt: existing.startAt,
      endAt: existing.endAt,
      workOrderId: existing.workOrderId,
    };
  }

  const cWo = candidate.workOrderId;
  const eWo = existing.workOrderId;
  if (cWo && eWo && cWo === eWo) {
    return {
      eventId: existing.id,
      conflictType: "same_wo",
      title: existing.title,
      startAt: existing.startAt,
      endAt: existing.endAt,
      workOrderId: eWo,
    };
  }

  if (!cWo || !eWo || cWo !== eWo) {
    return {
      eventId: existing.id,
      conflictType: "cross_wo",
      title: existing.title,
      startAt: existing.startAt,
      endAt: existing.endAt,
      workOrderId: eWo,
    };
  }

  return null;
}

export function detectConflicts(
  candidate: Pick<WorkshopScheduleSession, "startAt" | "endAt" | "workOrderId" | "eventType">,
  existing: readonly Pick<
    WorkshopScheduleSession,
    "id" | "startAt" | "endAt" | "workOrderId" | "eventType" | "title" | "planningStatus"
  >[],
  excludeId?: string,
): WorkshopScheduleConflict[] {
  const out: WorkshopScheduleConflict[] = [];
  for (const row of existing) {
    if (excludeId && row.id === excludeId) continue;
    const c = classifyOverlap(candidate, row);
    if (c) out.push(c);
  }
  return out;
}

export function hasHardConflict(conflicts: readonly WorkshopScheduleConflict[]): boolean {
  return conflicts.some((c) => c.conflictType === "cross_wo" || c.conflictType === "block");
}
