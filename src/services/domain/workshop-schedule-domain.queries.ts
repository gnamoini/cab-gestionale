"use client";

import { stableFiltersKey } from "@/lib/workshop-schedule/workshop-schedule-filters";

export const workshopScheduleQueryKeys = {
  root: ["workshop_schedule_events"] as const,
  range: (startIso: string, endIso: string, filtersKey: string) =>
    [...workshopScheduleQueryKeys.root, "range", startIso, endIso, filtersKey] as const,
  byWorkOrder: (workOrderId: string) => [...workshopScheduleQueryKeys.root, "byWorkOrder", workOrderId] as const,
  event: (id: string) => [...workshopScheduleQueryKeys.root, "event", id] as const,
  dayCapacity: (ymd: string) => [...workshopScheduleQueryKeys.root, "dayCapacity", ymd] as const,
};

export function workshopScheduleRangeKey(startIso: string, endIso: string, filtersKey?: string) {
  return workshopScheduleQueryKeys.range(startIso, endIso, filtersKey ?? "all");
}

export { stableFiltersKey };
