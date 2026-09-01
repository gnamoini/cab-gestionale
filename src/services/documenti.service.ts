"use client";

import { DOCUMENTI_COLUMNS } from "@/lib/db/table-select-columns";
import { resolveWriteActorIdFromClient } from "@/lib/audit/resolve-actor";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { deleteDocumentoFully } from "@/lib/documenti/delete-documento-fully";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { CategoriaDocumento, DocumentoRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "documenti";

export type DocumentiFilters = {
  /** @deprecated Non usare: i documenti si filtrano per marca/modello. */
  mezzo_id?: string;
  /** Filtro server-side per marca (ilike). Il match sul modello avviene in UI/hub. */
  marca?: string;
  categoria?: CategoriaDocumento;
};

export type DocumentoInsert = Omit<DocumentoRow, "id" | "created_at">;
export type DocumentoUpdate = Partial<DocumentoInsert>;

function mergeDocumentoMeta(
  data: DocumentoInsert | DocumentoUpdate,
  opts?: { setUploadTimestamp?: boolean },
): DocumentoInsert | DocumentoUpdate {
  const base = (data.meta && typeof data.meta === "object" ? data.meta : {}) as Record<string, unknown>;
  const meta: Record<string, unknown> = { ...base };
  if (opts?.setUploadTimestamp && typeof meta.uploadedAt !== "string") {
    meta.uploadedAt = new Date().toISOString();
  }
  return { ...data, meta };
}

async function sb() {
  return getBrowserSupabase();
}

export const documentiService = {
  async getAll(filters?: DocumentiFilters): Promise<ServiceResult<DocumentoRow[]>> {
    try {
      const c = await sb();
      let q = c.from("documenti").select(DOCUMENTI_COLUMNS).order("created_at", { ascending: false });
      if (filters?.mezzo_id) q = q.eq("mezzo_id", filters.mezzo_id);
      if (filters?.marca?.trim()) q = q.ilike("marca", `%${filters.marca.trim()}%`);
      if (filters?.categoria) q = q.eq("categoria", filters.categoria);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as DocumentoRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("documenti").select(DOCUMENTI_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Documento non trovato");
      return success(data as DocumentoRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: DocumentoInsert): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const merged = mergeDocumentoMeta(data, { setUploadTimestamp: true }) as DocumentoInsert;
      const userId = await resolveWriteActorIdFromClient(c);
      const insertPayload = userId ? { ...merged, created_by: userId } : merged;
      const { data: row, error } = await c.from("documenti").insert(insertPayload).select(DOCUMENTI_COLUMNS).single();
      if (error) return err(error.message);
      const r = row as DocumentoRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: DocumentoUpdate): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("documenti").select(DOCUMENTI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const prevMeta =
        before?.meta && typeof before.meta === "object" && !Array.isArray(before.meta)
          ? (before.meta as Record<string, unknown>)
          : {};
      const nextMeta =
        data.meta && typeof data.meta === "object" && !Array.isArray(data.meta)
          ? (data.meta as Record<string, unknown>)
          : {};
      const merged = mergeDocumentoMeta({ ...data, meta: { ...prevMeta, ...nextMeta } }, { setUploadTimestamp: false });
      const { data: row, error } = await c.from("documenti").update(merged).eq("id", id).select(DOCUMENTI_COLUMNS).single();
      if (error) return err(error.message);
      const r = row as DocumentoRow;
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
      const c = await sb();
      return deleteDocumentoFully(c, id);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
