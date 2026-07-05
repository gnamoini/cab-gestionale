"use client";

import { LOG_MODIFICHE_COLUMNS, LOG_MODIFICHE_WITH_PROFILE_SELECT } from "@/lib/db/table-select-columns";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { buildLogModificaSummary, mergePayloadWithSummary } from "@/lib/gestionale-log/log-summary";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

import { errMessageFromSupabase, serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type LogFilters = {
  entita?: string;
  entita_id?: string;
  limit?: number;
};

export type LogInsert = Omit<LogModificaRow, "id" | "created_at">;

async function sb() {
  return getBrowserSupabase();
}

export const logService = {
  async getAll(filters?: LogFilters): Promise<ServiceResult<LogModificaWithProfileRow[]>> {
    try {
      const c = await sb();
      const effectiveLimit = Math.min(
        Math.max(filters?.limit ?? LOG_MODIFICHE_RETENTION_PER_ENTITA, 1),
        LOG_MODIFICHE_RETENTION_PER_ENTITA,
      );
      let q = c
        .from("log_modifiche")
        .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);
      if (filters?.entita) q = q.eq("entita", filters.entita);
      if (filters?.entita_id) q = q.eq("entita_id", filters.entita_id);
      const { data, error } = await q;
      if (error) return err(errMessageFromSupabase(error, { action: "read" }));
      return success((data ?? []) as unknown as LogModificaWithProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Cronologia per una singola entità (append + query). */
  async getByEntita(
    entita: string,
    entita_id: string,
    limit = LOG_MODIFICHE_RETENTION_PER_ENTITA,
  ): Promise<ServiceResult<LogModificaWithProfileRow[]>> {
    return logService.getAll({ entita, entita_id, limit });
  },

  async getById(id: string): Promise<ServiceResult<LogModificaRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("log_modifiche").select(LOG_MODIFICHE_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Voce log non trovata");
      return success(data as LogModificaRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Append-only: inserimento manuale (es. eventi applicativi). */
  async create(data: LogInsert): Promise<ServiceResult<LogModificaRow>> {
    try {
      const c = await sb();
      const summary = buildLogModificaSummary({
        entita: data.entita,
        entita_id: data.entita_id,
        azione: data.azione,
        payload: data.payload,
      });
      const payload = mergePayloadWithSummary(data.payload, summary);
      const { data: row, error } = await c.from("log_modifiche").insert({ ...data, payload }).select(LOG_MODIFICHE_COLUMNS).single();
      if (error) return err(errMessageFromSupabase(error));
      return success(row as LogModificaRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markReverted(id: string, input: { reverted_by?: string | null; undo_log_id?: string | null; pageKey?: GestionalePageKey }): Promise<ServiceResult<LogModificaRow>> {
    try {
      const allowed = await ensurePageWrite(input.pageKey ?? "lavorazioni");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: before, error: e0 } = await c.from("log_modifiche").select(LOG_MODIFICHE_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Voce log non trovata");
      const payload = before.payload && typeof before.payload === "object" ? (before.payload as Record<string, unknown>) : {};
      const revertPayload = {
        reverted_log_id: id,
        reverted: true,
        reverted_at: new Date().toISOString(),
        reverted_by: input.reverted_by ?? null,
        undo_log_id: input.undo_log_id ?? null,
        previous_payload: payload,
      };
      const { data, error } = await c
        .from("log_modifiche")
        .insert({
          entita: before.entita,
          entita_id: before.entita_id,
          azione: "reverted",
          autore_id: input.reverted_by ?? null,
          payload: revertPayload,
        })
        .select(LOG_MODIFICHE_COLUMNS)
        .single();
      if (error) return err(error.message);
      return success(data as LogModificaRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(_id: string, _data: Partial<LogModificaRow>): Promise<ServiceResult<LogModificaRow>> {
    void _id;
    void _data;
    return err("log_modifiche è append-only");
  },

  async remove(_id: string): Promise<ServiceResult<null>> {
    void _id;
    return err("log_modifiche è append-only");
  },
};
