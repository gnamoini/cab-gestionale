"use client";

import { OPERATIONAL_DIARY_BODY_MAX } from "@/lib/operational-diary/operational-diary-week";
import { OPERATIONAL_DIARY_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OperationalDiaryEntryRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type OperationalDiaryUpsert = {
  workDate: string;
  body: string;
};

async function sb() {
  return getBrowserSupabase();
}

function normalizeYmd(raw: string): string | null {
  const t = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)), 12, 0, 0, 0);
  if (ymdFromDate(d) !== t) return null;
  return t;
}

function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const operationalDiaryService = {
  async list(input?: { fromYmd?: string; toYmd?: string }): Promise<ServiceResult<OperationalDiaryEntryRow[]>> {
    try {
      const c = await sb();
      let q = c
        .from("operational_diary_entries")
        .select(OPERATIONAL_DIARY_ENTRIES_COLUMNS)
        .is("deleted_at", null)
        .order("work_date", { ascending: false });
      const from = input?.fromYmd ? normalizeYmd(input.fromYmd) : null;
      const to = input?.toYmd ? normalizeYmd(input.toYmd) : null;
      if (from) q = q.gte("work_date", from);
      if (to) q = q.lte("work_date", to);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as OperationalDiaryEntryRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(input: OperationalDiaryUpsert): Promise<ServiceResult<OperationalDiaryEntryRow | null>> {
    try {
      const workDate = normalizeYmd(input.workDate);
      if (!workDate) return err("Data non valida (usa YYYY-MM-DD).");
      const body = input.body.trim().slice(0, OPERATIONAL_DIARY_BODY_MAX);
      const c = await sb();

      const { data: existing, error: findErr } = await c
        .from("operational_diary_entries")
        .select("id")
        .eq("work_date", workDate)
        .is("deleted_at", null)
        .maybeSingle();
      if (findErr) return err(findErr.message);

      if (!body) {
        if (!existing?.id) return success(null);
        const now = new Date().toISOString();
        const { error } = await c
          .from("operational_diary_entries")
          .update({ deleted_at: now })
          .eq("id", existing.id);
        if (error) return err(error.message);
        return success(null);
      }

      if (existing?.id) {
        const { data, error } = await c
          .from("operational_diary_entries")
          .update({ body })
          .eq("id", existing.id)
          .select(OPERATIONAL_DIARY_ENTRIES_COLUMNS)
          .single();
        if (error) return err(error.message);
        return success(data as OperationalDiaryEntryRow);
      }

      const { data, error } = await c
        .from("operational_diary_entries")
        .insert({ work_date: workDate, body })
        .select(OPERATIONAL_DIARY_ENTRIES_COLUMNS)
        .single();
      if (error) return err(error.message);
      return success(data as OperationalDiaryEntryRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
