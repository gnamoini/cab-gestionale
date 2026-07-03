"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkshopScheduleFilters } from "@/lib/workshop-schedule/types";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";
import { filterSessions, stableFiltersKey } from "@/lib/workshop-schedule/workshop-schedule-filters";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import {
  workshopScheduleQueryKeys,
  workshopScheduleRangeKey,
} from "@/src/services/domain/workshop-schedule-domain.queries";
import { workshopScheduleService } from "@/src/services/workshop-schedule.service";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";

export function useWorkshopScheduleRange(
  startIso: string,
  endIso: string,
  filters?: WorkshopScheduleFilters,
) {
  const filtersKey = stableFiltersKey(filters);
  const queryKey = workshopScheduleRangeKey(startIso, endIso, filtersKey);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await workshopScheduleService.enrichedView(startIso, endIso, filters);
      if (!res.success) throw new Error(res.error ?? "Caricamento agenda fallito");
      return res.data ?? [];
    },
  });

  useCabSyncListener("workshop_schedule_events", (ev) => {
    if (ev.type === "settings_updated") return;
    if (ev.type !== "entity_created" && ev.type !== "entity_updated" && ev.type !== "entity_deleted") return;
    if (shouldSuppressRemoteCacheInvalidation("workshop_schedule_events", ev.id)) return;
    void query.refetch();
  });

  const sessions = useMemo(() => filterSessions(query.data ?? [], filters), [query.data, filters]);
  return { ...query, sessions };
}

export function useWorkshopScheduleDayCapacity(dayYmd: string, startIso: string, endIso: string) {
  const { sessions } = useWorkshopScheduleRange(startIso, endIso);
  return useMemo(() => {
    const daySessions = sessions.filter((s) => ymdFromIso(s.startAt) === dayYmd || ymdFromIso(s.endAt) === dayYmd);
    return computeDayCapacity(dayYmd, daySessions);
  }, [dayYmd, sessions]);
}

export function useWorkshopScheduleByWorkOrder(workOrderId: string | undefined, enabled = true) {
  const id = workOrderId?.trim() ?? "";
  const query = useQuery({
    queryKey: workshopScheduleQueryKeys.byWorkOrder(id),
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const res = await workshopScheduleService.listByWorkOrder(id);
      if (!res.success) throw new Error(res.error ?? "Caricamento pianificazione fallito");
      return res.data ?? [];
    },
  });

  useCabSyncListener("workshop_schedule_events", (ev) => {
    if (!id) return;
    if (ev.type === "settings_updated") return;
    if (ev.type !== "entity_created" && ev.type !== "entity_updated" && ev.type !== "entity_deleted") return;
    if (shouldSuppressRemoteCacheInvalidation("workshop_schedule_events", ev.id)) return;
    void query.refetch();
  });

  return query;
}

export function useInvalidateWorkshopSchedule() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: workshopScheduleQueryKeys.root });
}
