"use client";

import {
  monthDateRange,
  type DashboardPromemoriaDeleteInput,
  type DashboardPromemoriaInput,
  type DashboardPromemoriaMonthKey,
  type DashboardPromemoriaRow,
  type DashboardPromemoriaUpdateInput,
} from "@/lib/dashboard/dashboard-promemoria-types";
import {
  expandRecurrenceOccurrences,
  validateRecurrenceInput,
  type PromemoriaRecurrenceScope,
} from "@/lib/dashboard/dashboard-promemoria-recurrence";
import { normalizePromemoriaEventTime } from "@/lib/dashboard/dashboard-promemoria-reminder";
import { DASHBOARD_PROMEMORIA_COLUMNS } from "@/lib/db/table-select-columns";
import { clampTextOrNull, PROMEMORIA_DESCRIPTION_MAX } from "@/lib/validation/text-field-limits";
import { errMessageFromSupabase } from "@/src/utils/supabaseErrorHandler";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const TABLE = "dashboard_promemoria";

async function sb() {
  return getBrowserSupabase();
}

function parseEventDate(raw: string): string | null {
  const t = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function normalizeTitle(raw: string): string {
  return raw.trim().slice(0, 200);
}

function normalizeDescription(raw: string | null | undefined): string | null {
  return clampTextOrNull(raw, PROMEMORIA_DESCRIPTION_MAX);
}

function normalizeScope(scope?: PromemoriaRecurrenceScope): PromemoriaRecurrenceScope {
  return scope === "following" || scope === "series" ? scope : "single";
}

function mapRow(data: Record<string, unknown>): DashboardPromemoriaRow {
  return data as unknown as DashboardPromemoriaRow;
}

function recurrenceDbFields(
  enabled: boolean,
  frequency: DashboardPromemoriaInput["recurrence"],
  seriesId: string | null,
): Record<string, unknown> {
  if (!enabled || !frequency?.frequency || !seriesId) {
    return {
      series_id: null,
      recurrence_frequency: null,
      recurrence_interval: 1,
      recurrence_until: null,
    };
  }
  return {
    series_id: seriesId,
    recurrence_frequency: frequency.frequency,
    recurrence_interval: Math.max(1, Math.floor(frequency.interval ?? 1)),
    recurrence_until: frequency.untilYmd ?? null,
  };
}

export const dashboardPromemoriaService = {
  async listByMonth(monthKey: DashboardPromemoriaMonthKey): Promise<ServiceResult<DashboardPromemoriaRow[]>> {
    try {
      const { from, to } = monthDateRange(monthKey);
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select(DASHBOARD_PROMEMORIA_COLUMNS)
        .is("deleted_at", null)
        .gte("event_date", from)
        .lte("event_date", to)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true, nullsFirst: true })
        .order("title", { ascending: true });
      if (error) return err(error.message);
      return success((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listByDate(eventDate: string): Promise<ServiceResult<DashboardPromemoriaRow[]>> {
    try {
      const ymd = parseEventDate(eventDate);
      if (!ymd) return err("Data non valida.");
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select(DASHBOARD_PROMEMORIA_COLUMNS)
        .is("deleted_at", null)
        .eq("event_date", ymd)
        .order("event_time", { ascending: true, nullsFirst: true })
        .order("title", { ascending: true });
      if (error) return err(error.message);
      return success((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listDueTodayForReminder(): Promise<ServiceResult<DashboardPromemoriaRow[]>> {
    try {
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select(DASHBOARD_PROMEMORIA_COLUMNS)
        .is("deleted_at", null)
        .eq("event_date", ymd)
        .order("event_time", { ascending: true, nullsFirst: true })
        .order("title", { ascending: true });
      if (error) return err(error.message);
      const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
      return success(rows);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: DashboardPromemoriaInput): Promise<ServiceResult<DashboardPromemoriaRow>> {
    try {
      const eventDate = parseEventDate(input.eventDate);
      const title = normalizeTitle(input.title);
      if (!eventDate) return err("Seleziona una data valida.");
      if (!title) return err("Il titolo è obbligatorio.");
      const eventTime = normalizePromemoriaEventTime(input.eventTime);
      const recurrence = input.recurrence;
      const recurring = Boolean(recurrence?.enabled);

      if (recurring) {
        const validation = validateRecurrenceInput(
          eventDate,
          recurrence?.frequency ?? null,
          recurrence?.interval ?? 1,
          recurrence?.untilYmd ?? "",
          true,
        );
        if (!validation.ok) return err(validation.message);
        const dates = expandRecurrenceOccurrences(
          eventDate,
          recurrence!.frequency!,
          recurrence?.interval ?? 1,
          recurrence!.untilYmd!,
        );
        const seriesId = crypto.randomUUID();
        const recFields = recurrenceDbFields(true, recurrence, seriesId);
        const rows = dates.map((d) => ({
          event_date: d,
          event_time: eventTime,
          title,
          description: normalizeDescription(input.description),
          ...recFields,
        }));
        const c = await sb();
        const { data, error } = await c.from(TABLE).insert(rows).select(DASHBOARD_PROMEMORIA_COLUMNS);
        if (error) return err(error.message);
        const first = (data ?? [])[0];
        if (!first) return err("Creazione promemoria fallita.");
        return success(mapRow(first as Record<string, unknown>));
      }

      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .insert({
          event_date: eventDate,
          event_time: eventTime,
          title,
          description: normalizeDescription(input.description),
          ...recurrenceDbFields(false, undefined, null),
        })
        .select(DASHBOARD_PROMEMORIA_COLUMNS)
        .single();
      if (error) return err(error.message);
      return success(mapRow(data as Record<string, unknown>));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(input: DashboardPromemoriaUpdateInput): Promise<ServiceResult<DashboardPromemoriaRow>> {
    try {
      const eventDate = parseEventDate(input.eventDate);
      const title = normalizeTitle(input.title);
      if (!eventDate) return err("Seleziona una data valida.");
      if (!title) return err("Il titolo è obbligatorio.");
      const eventTime = normalizePromemoriaEventTime(input.eventTime);
      const scope = normalizeScope(input.scope);
      const c = await sb();
      const { data: existing, error: fetchError } = await c
        .from(TABLE)
        .select("id, event_date, event_time, series_id")
        .eq("id", input.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (fetchError) return err(fetchError.message);
      if (!existing) return err("Promemoria non trovato.");

      const dateOrTimeChanged =
        existing.event_date !== eventDate || (existing.event_time ?? null) !== eventTime;

      const basePatch: Record<string, unknown> = {
        title,
        description: normalizeDescription(input.description),
        event_time: eventTime,
      };

      if (scope === "single" || !existing.series_id) {
        const patch: Record<string, unknown> = {
          ...basePatch,
          event_date: eventDate,
        };
        if (dateOrTimeChanged) patch.notified_on = null;
        const { data, error } = await c
          .from(TABLE)
          .update(patch)
          .eq("id", input.id)
          .is("deleted_at", null)
          .select(DASHBOARD_PROMEMORIA_COLUMNS)
          .single();
        if (error) return err(error.message);
        return success(mapRow(data as Record<string, unknown>));
      }

      if (dateOrTimeChanged) basePatch.notified_on = null;

      if (scope === "series") {
        const { error: updErr } = await c
          .from(TABLE)
          .update(basePatch)
          .eq("series_id", existing.series_id)
          .is("deleted_at", null);
        if (updErr) return err(updErr.message);
        const { data: row, error: rowErr } = await c
          .from(TABLE)
          .select(DASHBOARD_PROMEMORIA_COLUMNS)
          .eq("id", input.id)
          .is("deleted_at", null)
          .single();
        if (rowErr) return err(rowErr.message);
        return success(mapRow(row as Record<string, unknown>));
      }

      // following
      const { error: updErr } = await c
        .from(TABLE)
        .update(basePatch)
        .eq("series_id", existing.series_id)
        .gte("event_date", existing.event_date)
        .is("deleted_at", null);
      if (updErr) return err(updErr.message);
      const { data: row, error: rowErr } = await c
        .from(TABLE)
        .select(DASHBOARD_PROMEMORIA_COLUMNS)
        .eq("id", input.id)
        .is("deleted_at", null)
        .single();
      if (rowErr) return err(rowErr.message);
      return success(mapRow(row as Record<string, unknown>));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async softDelete(input: DashboardPromemoriaDeleteInput | string): Promise<ServiceResult<number>> {
    try {
      const id = typeof input === "string" ? input : input.id;
      const scope = typeof input === "string" ? "single" : normalizeScope(input.scope);
      const c = await sb();
      const { data, error: rpcErr } = await c.rpc("soft_delete_dashboard_promemoria", {
        p_id: id,
        p_scope: scope,
      });
      if (rpcErr) {
        const msg = rpcErr.message ?? "";
        if (/non trovato|già eliminato/i.test(msg)) return err(msg);
        return err(errMessageFromSupabase(rpcErr, { action: "delete" }));
      }
      const count = typeof data === "number" ? data : 1;
      return success(count);
    } catch (e) {
      return serviceFailFromError<number>(e, 0, { action: "delete" });
    }
  },

  async markNotified(id: string, dateYmd: string): Promise<ServiceResult<true>> {
    try {
      const ymd = parseEventDate(dateYmd);
      if (!ymd) return err("Data non valida.");
      const c = await sb();
      const { error } = await c.from(TABLE).update({ notified_on: ymd }).eq("id", id).is("deleted_at", null);
      if (error) return err(error.message);
      return success(true);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
