import { lavorazioniMezziEmbedSelect } from "@/lib/db/table-select-columns";
import "server-only";

import { cache } from "react";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { WorkshopScheduleFilters, WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import type { WorkshopScheduleDbRow } from "@/lib/workshop-schedule/workshop-schedule-db-mapper";
import {
  enrichedViewFromRows,
  type LavorazioneProjectionRow,
} from "@/lib/workshop-schedule/workshop-schedule-projection";
import { buildDayBoundsIso } from "@/lib/workshop-schedule/datetime";
import { stableFiltersKey } from "@/lib/workshop-schedule/workshop-schedule-filters";

function filtersToJson(filters?: WorkshopScheduleFilters): Record<string, unknown> {
  if (!filters) return {};
  const out: Record<string, unknown> = {};
  if (filters.eventTypes?.length) out.event_types = filters.eventTypes;
  if (filters.planningStatuses?.length) out.planning_statuses = filters.planningStatuses;
  if (filters.priorities?.length) out.priorities = filters.priorities;
  if (filters.withWorkOrder === true) out.with_work_order = "true";
  if (filters.withWorkOrder === false) out.with_work_order = "false";
  if (filters.createdBy) out.created_by = filters.createdBy;
  if (filters.workOrderId) out.work_order_id = filters.workOrderId;
  return out;
}

function todayYmdRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function fetchWorkOrderProjectionsServer(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  ids: string[],
): Promise<Map<string, LavorazioneProjectionRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, LavorazioneProjectionRow>();
  if (unique.length === 0) return map;
  const { data, error } = await sb
    .from("lavorazioni")
    .select(`id, codice, stato, addetto, ${lavorazioniMezziEmbedSelect("targa, marca, modello, cliente")}`)
    .in("id", unique)
    .is("deleted_at", null);
  if (error || !data) return map;
  for (const row of data as unknown as Array<{
    id: string;
    codice?: string | null;
    stato?: string | null;
    addetto?: string | null;
    mezzi?: { targa?: string | null; marca?: string | null; modello?: string | null; cliente?: string | null } | null;
  }>) {
    map.set(row.id, {
      id: row.id,
      codice: row.codice ?? null,
      cliente: row.mezzi?.cliente ?? null,
      stato: row.stato ?? null,
      mezzo: row.mezzi
        ? { targa: row.mezzi.targa, marca: row.mezzi.marca, modello: row.mezzi.modello }
        : null,
      addetto: row.addetto ?? null,
    });
  }
  return map;
}

export async function fetchWorkshopScheduleRangeServer(
  startIso: string,
  endIso: string,
  filters?: WorkshopScheduleFilters,
): Promise<ServiceResult<WorkshopScheduleSessionView[]>> {
  const allowed = await verifyServerPageRead("agenda");
  if (!allowed) return err("Permesso richiesto.");
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb.rpc("cab_list_workshop_schedule_events", {
      p_start: startIso,
      p_end: endIso,
      p_filters: filtersToJson(filters),
    });
    if (error) return err(error.message);
    const rows = (data ?? []) as WorkshopScheduleDbRow[];
    const woIds = rows.map((r) => r.work_order_id).filter((id): id is string => Boolean(id));
    const woMap = await fetchWorkOrderProjectionsServer(sb, woIds);
    return success(enrichedViewFromRows(rows, woMap));
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export type AgendaPageSeedRange = {
  rangeStart: string;
  rangeEnd: string;
  filtersKey: string;
};

/** Range default SSR agenda — giorno corrente (Europe/Rome). */
export function defaultAgendaPageSeedRange(): AgendaPageSeedRange {
  const ymd = todayYmdRome();
  const bounds = buildDayBoundsIso(ymd, 0, 24);
  return { rangeStart: bounds.start, rangeEnd: bounds.end, filtersKey: stableFiltersKey() };
}

export const fetchAgendaPageDefaultRangeServer = cache(async () => {
  const { rangeStart, rangeEnd, filtersKey } = defaultAgendaPageSeedRange();
  const res = await fetchWorkshopScheduleRangeServer(rangeStart, rangeEnd);
  return {
    rangeStart,
    rangeEnd,
    filtersKey,
    sessions: res.success ? (res.data ?? []) : [],
  };
});
