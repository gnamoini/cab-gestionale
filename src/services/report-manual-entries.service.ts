"use client";

import { isPastReportMonth, startOfCurrentMonthLocal } from "@/lib/report/report-manual-entries-map";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type ReportManualEntryUpsert = {
  periodMonth: string;
  completedCount: number;
  note?: string | null;
};

async function sb() {
  return getBrowserSupabase();
}

function normalizePeriodMonth(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t.slice(0, 7)}-01`;
  return null;
}

function validatePastMonth(periodMonthYmd: string): ServiceResult<true> {
  if (!isPastReportMonth(periodMonthYmd)) {
    return err("Solo mesi precedenti al mese corrente possono essere modificati manualmente.");
  }
  return success(true as const);
}

export const reportManualEntriesService = {
  async list(): Promise<ServiceResult<ReportManualEntryRow[]>> {
    try {
      const allowed = await ensureSectionRead("report");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("report_manual_entries")
        .select("*")
        .is("deleted_at", null)
        .order("period_month", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as ReportManualEntryRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(input: ReportManualEntryUpsert): Promise<ServiceResult<ReportManualEntryRow>> {
    try {
      const allowed = await ensureSectionWrite("report");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const periodMonth = normalizePeriodMonth(input.periodMonth);
      if (!periodMonth) return err("Periodo non valido (usa YYYY-MM).");
      const past = validatePastMonth(periodMonth);
      if (!past.success) return past;
      const count = Math.round(Number(input.completedCount));
      if (!Number.isFinite(count) || count < 0) return err("Numero completate non valido.");
      const note = input.note?.trim() || null;

      const c = await sb();
      const { data: existing, error: findErr } = await c
        .from("report_manual_entries")
        .select("id")
        .eq("period_month", periodMonth)
        .is("deleted_at", null)
        .maybeSingle();
      if (findErr) return err(findErr.message);

      if (existing?.id) {
        const { data, error } = await c
          .from("report_manual_entries")
          .update({ completed_count: count, note })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) return err(error.message);
        return success(data as ReportManualEntryRow);
      }

      const { data, error } = await c
        .from("report_manual_entries")
        .insert({ period_month: periodMonth, completed_count: count, note })
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as ReportManualEntryRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const allowed = await ensureSectionWrite("report");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: row, error: getErr } = await c
        .from("report_manual_entries")
        .select("period_month")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (getErr) return err(getErr.message);
      if (!row) return err("Voce non trovata.");
      if (!isPastReportMonth(String(row.period_month))) {
        return err("Non è possibile eliminare dati del mese corrente o futuro.");
      }
      const now = new Date().toISOString();
      const { error } = await c.from("report_manual_entries").update({ deleted_at: now }).eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Utility per validazione UI. */
  startOfCurrentMonthLocal,
};
