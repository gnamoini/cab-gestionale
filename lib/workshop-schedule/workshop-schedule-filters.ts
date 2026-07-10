import type { WorkshopScheduleFilters, WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

export function countActiveFilters(filters: WorkshopScheduleFilters): number {
  let n = 0;
  if (filters.eventTypes?.length) n += 1;
  if (filters.planningStatuses?.length) n += 1;
  if (filters.priorities?.length) n += 1;
  if (filters.withWorkOrder != null) n += 1;
  if (filters.workOrderId) n += 1;
  if (filters.createdBy) n += 1;
  return n;
}

export function stableFiltersKey(filters?: WorkshopScheduleFilters): string {
  if (!filters) return "all";
  const parts: string[] = [];
  if (filters.eventTypes?.length) parts.push(`et:${[...filters.eventTypes].sort().join(",")}`);
  if (filters.priorities?.length) parts.push(`pr:${[...filters.priorities].sort().join(",")}`);
  if (filters.planningStatuses?.length) parts.push(`ps:${[...filters.planningStatuses].sort().join(",")}`);
  if (filters.withWorkOrder === true) parts.push("wo:1");
  if (filters.withWorkOrder === false) parts.push("wo:0");
  if (filters.createdBy) parts.push(`cb:${filters.createdBy}`);
  if (filters.workOrderId) parts.push(`woid:${filters.workOrderId}`);
  return parts.length ? parts.join("|") : "all";
}

export function filterSessions(
  sessions: readonly WorkshopScheduleSessionView[],
  filters?: WorkshopScheduleFilters,
): WorkshopScheduleSessionView[] {
  if (!filters) return [...sessions];
  return sessions.filter((s) => {
    if (filters.eventTypes?.length && !filters.eventTypes.includes(s.eventType)) return false;
    if (filters.priorities?.length) {
      if (s.priority == null || !filters.priorities.includes(s.priority)) return false;
    }
    if (filters.planningStatuses?.length && !filters.planningStatuses.includes(s.planningStatus)) return false;
    if (filters.withWorkOrder === true && !s.workOrderId) return false;
    if (filters.withWorkOrder === false && s.workOrderId) return false;
    if (filters.createdBy && s.createdBy !== filters.createdBy) return false;
    if (filters.workOrderId && s.workOrderId !== filters.workOrderId) return false;
    return true;
  });
}

export function sortSessionsChronological(sessions: readonly WorkshopScheduleSessionView[]): WorkshopScheduleSessionView[] {
  return [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt));
}
