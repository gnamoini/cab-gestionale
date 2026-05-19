"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission, ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "mezzi";

export type MezzoFilters = {
  cliente?: string;
  marca?: string;
  modello?: string;
  /** Contiene (case-insensitive) */
  targa?: string;
  /** Contiene (case-insensitive) — colonna `numero_scuderia` */
  numero_scuderia?: string;
  /** Ricerca OR su cliente, marca, modello, targa, matricola, numero_scuderia */
  search?: string;
};

export type MezzoInsert = Omit<MezzoRow, "id" | "created_at" | "updated_at">;
export type MezzoUpdate = Partial<MezzoInsert>;

async function sb() {
  return getBrowserSupabase();
}

async function countMezzoDependencies(id: string): Promise<ServiceResult<MezzoDependencies>> {
  try {
    const c = await sb();
    const [lavRes, pvRes] = await Promise.all([
      c.from("lavorazioni").select("*", { count: "exact", head: true }).eq("mezzo_id", id),
      c.from("preventivi").select("*", { count: "exact", head: true }).eq("mezzo_id", id),
    ]);
    if (lavRes.error) return err(lavRes.error.message);
    if (pvRes.error) return err(pvRes.error.message);
    return success({
      lavorazioni: lavRes.count ?? 0,
      preventivi: pvRes.count ?? 0,
    });
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export type MezzoDependencies = {
  lavorazioni: number;
  preventivi: number;
};

export const mezziService = {
  countDependencies: countMezzoDependencies,

  async getAll(filters?: MezzoFilters): Promise<ServiceResult<MezzoRow[]>> {
    try {
      const allowed = await ensureSectionRead("mezzi");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      let q = c.from("mezzi").select("*").order("created_at", { ascending: false });
      if (filters?.cliente?.trim()) q = q.ilike("cliente", `%${filters.cliente.trim()}%`);
      if (filters?.marca?.trim()) q = q.ilike("marca", `%${filters.marca.trim()}%`);
      if (filters?.modello?.trim()) q = q.ilike("modello", `%${filters.modello.trim()}%`);
      if (filters?.targa?.trim()) q = q.ilike("targa", `%${filters.targa.trim()}%`);
      if (filters?.numero_scuderia?.trim()) q = q.ilike("numero_scuderia", `%${filters.numero_scuderia.trim()}%`);
      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(
          `cliente.ilike.%${s}%,marca.ilike.%${s}%,modello.ilike.%${s}%,targa.ilike.%${s}%,matricola.ilike.%${s}%,numero_scuderia.ilike.%${s}%`,
        );
      }
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as MezzoRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MezzoRow>> {
    try {
      const allowed = await ensureSectionRead("mezzi");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.from("mezzi").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Mezzo non trovato");
      return success(data as MezzoRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MezzoInsert): Promise<ServiceResult<MezzoRow>> {
    try {
      const allowed = await ensurePermission("editVehicles");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: row, error } = await c.from("mezzi").insert(data).select("*").single();
      if (error) return err(error.message);
      const r = row as MezzoRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MezzoUpdate): Promise<ServiceResult<MezzoRow>> {
    try {
      const allowed = await ensurePermission("editVehicles");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: before, error: e0 } = await c.from("mezzi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await c.from("mezzi").update(data).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as MezzoRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const allowed = await ensurePermission("editVehicles");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const deps = await countMezzoDependencies(id);
      if (!deps.success || !deps.data) return err(deps.error ?? "Verifica dipendenze fallita.");
      if (deps.data.lavorazioni > 0 || deps.data.preventivi > 0) {
        return err(
          `Impossibile eliminare: collegati ${deps.data.lavorazioni} lavorazioni e ${deps.data.preventivi} preventivi.`,
        );
      }
      const { data: existing, error: e0 } = await c.from("mezzi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) {
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "DELETE",
          payload: auditSnapshot(existing),
        });
      }
      const { error } = await c.from("mezzi").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
