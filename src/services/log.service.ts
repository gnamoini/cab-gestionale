"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import type { PermissionKey } from "@/src/lib/auth/permissions";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

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
  async getAll(filters?: LogFilters): Promise<ServiceResult<LogModificaRow[]>> {
    try {
      const c = await sb();
      let q = c.from("log_modifiche").select("*").order("created_at", { ascending: false });
      if (filters?.entita) q = q.eq("entita", filters.entita);
      if (filters?.entita_id) q = q.eq("entita_id", filters.entita_id);
      if (filters?.limit != null) q = q.limit(Math.min(Math.max(filters.limit, 1), 500));
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as LogModificaRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Cronologia per una singola entità (append + query). */
  async getByEntita(entita: string, entita_id: string, limit = 200): Promise<ServiceResult<LogModificaRow[]>> {
    return logService.getAll({ entita, entita_id, limit });
  },

  async getById(id: string): Promise<ServiceResult<LogModificaRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("log_modifiche").select("*").eq("id", id).maybeSingle();
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
      const { data: row, error } = await c.from("log_modifiche").insert(data).select("*").single();
      if (error) return err(error.message);
      return success(row as LogModificaRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markReverted(id: string, input: { reverted_by?: string | null; undo_log_id?: string | null; permission?: PermissionKey }): Promise<ServiceResult<LogModificaRow>> {
    try {
      const allowed = await ensurePermission(input.permission ?? "editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: before, error: e0 } = await c.from("log_modifiche").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Voce log non trovata");
      const payload = before.payload && typeof before.payload === "object" ? (before.payload as Record<string, unknown>) : {};
      const nextPayload = {
        ...payload,
        reverted: true,
        reverted_at: new Date().toISOString(),
        reverted_by: input.reverted_by ?? null,
        undo_log_id: input.undo_log_id ?? null,
      };
      const { data, error } = await c.from("log_modifiche").update({ payload: nextPayload }).eq("id", id).select("*").single();
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
