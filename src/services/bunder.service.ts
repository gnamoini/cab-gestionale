"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { bunderDocumentToRow, bunderRowToDocument } from "@/lib/bunder/bunder-db-mapper";
import type { BunderCommercialDocument } from "@/lib/bunder/types";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { BunderDocumentRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "bunder_documents";
const SECTION = "bunder" as const;

async function sb() {
  return getBrowserSupabase();
}

function oggettoBunder(row: BunderDocumentRow) {
  const parts = [row.numero_progressivo?.trim(), row.azienda_destinatario?.trim()].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

export const bunderService = {
  async getAll(): Promise<ServiceResult<BunderCommercialDocument[]>> {
    try {
      const allowed = await ensureSectionRead(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("bunder_documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []).map((row) => bunderRowToDocument(row as BunderDocumentRow)));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(doc: BunderCommercialDocument): Promise<ServiceResult<BunderCommercialDocument>> {
    try {
      const allowed = await ensureSectionWrite(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const row = bunderDocumentToRow(doc);
      const { data, error } = await c.from("bunder_documents").insert(row).select("*").single();
      if (error) return err(error.message);
      const saved = data as BunderDocumentRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: saved.id,
        azione: "CREATE",
        payload: auditSnapshot(saved, oggettoBunder(saved)),
      });
      return success(bunderRowToDocument(saved));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(doc: BunderCommercialDocument): Promise<ServiceResult<BunderCommercialDocument>> {
    try {
      const allowed = await ensureSectionWrite(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const row = bunderDocumentToRow(doc);
      const { data: before, error: e0 } = await c.from("bunder_documents").select("*").eq("id", doc.id).maybeSingle();
      if (e0) return err(e0.message);
      const { data, error } = await c
        .from("bunder_documents")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", doc.id)
        .select("*")
        .single();
      if (error) return err(error.message);
      const saved = data as BunderDocumentRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: doc.id,
        azione: "UPDATE",
        payload: auditDiff(before, saved, oggettoBunder(saved)),
      });
      return success(bunderRowToDocument(saved));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(doc: BunderCommercialDocument): Promise<ServiceResult<BunderCommercialDocument>> {
    try {
      const allowed = await ensureSectionWrite(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const row = bunderDocumentToRow(doc);
      const { data: before, error: e0 } = await c.from("bunder_documents").select("*").eq("id", doc.id).maybeSingle();
      if (e0) return err(e0.message);
      const { data, error } = await c
        .from("bunder_documents")
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("*")
        .single();
      if (error) return err(error.message);
      const saved = data as BunderDocumentRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: doc.id,
        azione: before ? "UPDATE" : "CREATE",
        payload: before
          ? auditDiff(before, saved, oggettoBunder(saved))
          : auditSnapshot(saved, oggettoBunder(saved)),
      });
      return success(bunderRowToDocument(saved));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const allowed = await ensureSectionWrite(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("bunder_documents").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { error } = await c.from("bunder_documents").delete().eq("id", id);
      if (error) return err(error.message);
      if (existing) {
        const row = existing as BunderDocumentRow;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "DELETE",
          payload: auditSnapshot(row, oggettoBunder(row)),
        });
      }
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async count(): Promise<ServiceResult<number>> {
    try {
      const allowed = await ensureSectionRead(SECTION);
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { count, error } = await c.from("bunder_documents").select("*", { count: "exact", head: true });
      if (error) return err(error.message);
      return success(count ?? 0);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};

export { ENTITA as BUNDER_ENTITA };
