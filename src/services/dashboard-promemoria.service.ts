"use client";

import {
  monthDateRange,
  type DashboardPromemoriaInput,
  type DashboardPromemoriaMonthKey,
  type DashboardPromemoriaRow,
  type DashboardPromemoriaUpdateInput,
} from "@/lib/dashboard/dashboard-promemoria-types";
import { normalizePromemoriaEventTime } from "@/lib/dashboard/dashboard-promemoria-reminder";
import { clampTextOrNull, PROMEMORIA_DESCRIPTION_MAX } from "@/lib/validation/text-field-limits";
import {
  ensureOperationalWrite,
  ensureSectionRead,
  ensureSectionWrite,
} from "@/src/lib/auth/permission-guards";
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

function mapRow(data: Record<string, unknown>): DashboardPromemoriaRow {
  return data as unknown as DashboardPromemoriaRow;
}

export const dashboardPromemoriaService = {
  async listByMonth(monthKey: DashboardPromemoriaMonthKey): Promise<ServiceResult<DashboardPromemoriaRow[]>> {
    try {
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const { from, to } = monthDateRange(monthKey);
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select("*")
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
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const ymd = parseEventDate(eventDate);
      if (!ymd) return err("Data non valida.");
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select("*")
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
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .select("*")
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
      const allowed = await ensureSectionWrite("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const eventDate = parseEventDate(input.eventDate);
      const title = normalizeTitle(input.title);
      if (!eventDate) return err("Seleziona una data valida.");
      if (!title) return err("Il titolo è obbligatorio.");
      const eventTime = normalizePromemoriaEventTime(input.eventTime);
      const c = await sb();
      const { data, error } = await c
        .from(TABLE)
        .insert({
          event_date: eventDate,
          event_time: eventTime,
          title,
          description: normalizeDescription(input.description),
        })
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(mapRow(data as Record<string, unknown>));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(input: DashboardPromemoriaUpdateInput): Promise<ServiceResult<DashboardPromemoriaRow>> {
    try {
      const allowed = await ensureSectionWrite("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const eventDate = parseEventDate(input.eventDate);
      const title = normalizeTitle(input.title);
      if (!eventDate) return err("Seleziona una data valida.");
      if (!title) return err("Il titolo è obbligatorio.");
      const eventTime = normalizePromemoriaEventTime(input.eventTime);
      const c = await sb();
      const { data: existing, error: fetchError } = await c
        .from(TABLE)
        .select("event_date, event_time")
        .eq("id", input.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (fetchError) return err(fetchError.message);
      if (!existing) return err("Promemoria non trovato.");
      const dateOrTimeChanged =
        existing.event_date !== eventDate || (existing.event_time ?? null) !== eventTime;
      const patch: Record<string, unknown> = {
        event_date: eventDate,
        event_time: eventTime,
        title,
        description: normalizeDescription(input.description),
      };
      if (dateOrTimeChanged) patch.notified_on = null;
      const { data, error } = await c
        .from(TABLE)
        .update(patch)
        .eq("id", input.id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(mapRow(data as Record<string, unknown>));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async softDelete(id: string): Promise<ServiceResult<true>> {
    try {
      const allowed = await ensureOperationalWrite();
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { error: rpcErr } = await c.rpc("soft_delete_dashboard_promemoria", { p_id: id });
      if (rpcErr) {
        const msg = rpcErr.message ?? "";
        if (/non trovato|già eliminato/i.test(msg)) return err(msg);
        return err(errMessageFromSupabase(rpcErr, { action: "delete" }));
      }
      return success(true);
    } catch (e) {
      return serviceFailFromError<true>(e, null, { action: "delete" });
    }
  },

  async markNotified(id: string, dateYmd: string): Promise<ServiceResult<true>> {
    try {
      const allowed = await ensureSectionRead("dashboard");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
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
