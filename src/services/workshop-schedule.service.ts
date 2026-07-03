"use client";

import type {
  WorkshopScheduleEventType,
  WorkshopScheduleFilters,
  WorkshopScheduleSessionView,
} from "@/lib/workshop-schedule/types";
import { enrichedViewFromRows } from "@/lib/workshop-schedule/workshop-schedule-projection";
import type { WorkshopScheduleDbRow } from "@/lib/workshop-schedule/workshop-schedule-db-mapper";
import { mapDbRowToSession } from "@/lib/workshop-schedule/workshop-schedule-db-mapper";
import { enrichSessionView, type LavorazioneProjectionRow } from "@/lib/workshop-schedule/workshop-schedule-projection";
import { ensureOperationalWrite, ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError, errMessageFromSupabase } from "@/src/utils/supabaseErrorHandler";

export type WorkshopScheduleUpsertInput = {
  id?: string | null;
  title: string;
  description?: string | null;
  eventType: WorkshopScheduleEventType;
  blockType?: string | null;
  startAt: string;
  endAt: string;
  planningStatus?: string;
  priority?: string | null;
  workOrderId?: string | null;
  seriesId?: string | null;
  recurrenceFrequency?: string | null;
  recurrenceInterval?: number | null;
  recurrenceUntil?: string | null;
};

export type WorkshopSchedulePatchTimesInput = {
  id: string;
  startAt: string;
  endAt: string;
};

async function sb() {
  return getBrowserSupabase();
}

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

async function fetchWorkOrderProjections(ids: string[]): Promise<Map<string, LavorazioneProjectionRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, LavorazioneProjectionRow>();
  if (unique.length === 0) return map;
  const c = await sb();
  const { data, error } = await c
    .from("lavorazioni")
    .select("id, codice, stato, addetto, mezzi(targa, marca, modello, cliente)")
    .in("id", unique)
    .is("deleted_at", null);
  if (error || !data) return map;
  for (const row of data as Array<{
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

export const workshopScheduleService = {
  async listRange(
    startIso: string,
    endIso: string,
    filters?: WorkshopScheduleFilters,
  ): Promise<ServiceResult<WorkshopScheduleSessionView[]>> {
    try {
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_list_workshop_schedule_events", {
        p_start: startIso,
        p_end: endIso,
        p_filters: filtersToJson(filters),
      });
      if (error) return err(error.message);
      const rows = (data ?? []) as WorkshopScheduleDbRow[];
      const woIds = rows.map((r) => r.work_order_id).filter((id): id is string => Boolean(id));
      const woMap = await fetchWorkOrderProjections(woIds);
      return success(enrichedViewFromRows(rows, woMap));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async enrichedView(
    startIso: string,
    endIso: string,
    filters?: WorkshopScheduleFilters,
  ): Promise<ServiceResult<WorkshopScheduleSessionView[]>> {
    return this.listRange(startIso, endIso, filters);
  },

  async listByWorkOrder(workOrderId: string): Promise<ServiceResult<WorkshopScheduleSessionView[]>> {
    try {
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_list_workshop_schedule_by_work_order", {
        p_work_order_id: workOrderId,
      });
      if (error) return err(error.message);
      const rows = (data ?? []) as WorkshopScheduleDbRow[];
      const woMap = await fetchWorkOrderProjections([workOrderId]);
      return success(enrichedViewFromRows(rows, woMap));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(input: WorkshopScheduleUpsertInput): Promise<ServiceResult<WorkshopScheduleSessionView>> {
    try {
      const allowed = await ensureSectionWrite("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_upsert_workshop_schedule_event", {
        p_id: input.id ?? null,
        p_title: input.title,
        p_description: input.description ?? null,
        p_event_type: input.eventType,
        p_block_type: input.blockType ?? null,
        p_start_at: input.startAt,
        p_end_at: input.endAt,
        p_planning_status: input.planningStatus ?? "scheduled",
        p_priority: input.priority ?? null,
        p_work_order_id: input.workOrderId ?? null,
        p_series_id: input.seriesId ?? null,
        p_recurrence_frequency: input.recurrenceFrequency ?? null,
        p_recurrence_interval: input.recurrenceInterval ?? 1,
        p_recurrence_until: input.recurrenceUntil ?? null,
      });
      if (error) return err(errMessageFromSupabase(error, { action: "update" }));
      const row = data as WorkshopScheduleDbRow;
      const session = mapDbRowToSession(row);
      const woMap = session.workOrderId ? await fetchWorkOrderProjections([session.workOrderId]) : new Map();
      return success(enrichSessionView(session, session.workOrderId ? woMap.get(session.workOrderId) : null));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async patchTimes(input: WorkshopSchedulePatchTimesInput): Promise<ServiceResult<WorkshopScheduleSessionView>> {
    try {
      const allowed = await ensureOperationalWrite();
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_patch_workshop_schedule_times", {
        p_id: input.id,
        p_start_at: input.startAt,
        p_end_at: input.endAt,
      });
      if (error) return err(errMessageFromSupabase(error, { action: "update" }));
      const row = data as WorkshopScheduleDbRow;
      const session = mapDbRowToSession(row);
      const woMap = session.workOrderId ? await fetchWorkOrderProjections([session.workOrderId]) : new Map();
      return success(enrichSessionView(session, session.workOrderId ? woMap.get(session.workOrderId) : null));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async softDelete(id: string): Promise<ServiceResult<true>> {
    try {
      const allowed = await ensureOperationalWrite();
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { error } = await c.rpc("soft_delete_workshop_schedule_event", { p_id: id });
      if (error) return err(errMessageFromSupabase(error, { action: "delete" }));
      return success(true);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async detectConflicts(
    startAt: string,
    endAt: string,
    workOrderId?: string | null,
    excludeId?: string | null,
  ): Promise<ServiceResult<Array<{ event_id: string; conflict_type: string; title: string }>>> {
    try {
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_detect_schedule_conflicts", {
        p_start: startAt,
        p_end: endAt,
        p_work_order_id: workOrderId ?? null,
        p_exclude_id: excludeId ?? null,
      });
      if (error) return err(error.message);
      return success((data ?? []) as Array<{ event_id: string; conflict_type: string; title: string }>);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async migratePromemoria(): Promise<ServiceResult<number>> {
    try {
      const allowed = await ensureSectionWrite("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("cab_migrate_dashboard_promemoria_to_schedule");
      if (error) return err(error.message);
      return success(typeof data === "number" ? data : 0);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
