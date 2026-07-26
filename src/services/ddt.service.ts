"use client";

import {
  DDT_DOCUMENTS_COLUMNS,
  DDT_DOCUMENTS_INDEX_COLUMNS,
  DDT_LINKS_COLUMNS,
  DDT_ROWS_COLUMNS,
} from "@/lib/db/table-select-columns";
import { fetchDdtListPayload } from "@/lib/ddt/ddt-fetch";
import type { DdtCreateInput, DdtDetail } from "@/lib/ddt/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "ddt_documents";

async function sb() {
  return getBrowserSupabase();
}

function cleanPayload(input: DdtCreateInput): Record<string, unknown> {
  return {
    status: input.status ?? "bozza",
    confirm: input.confirm ?? false,
    anno: input.anno,
    serie: input.serie,
    data_documento: input.data_documento,
    data_consegna: input.data_consegna ?? null,
    cliente_label: input.cliente_label.trim(),
    customer_snapshot: input.customer_snapshot ?? {},
    luogo_consegna: input.luogo_consegna ?? {},
    preventivo_id: input.preventivo_id ?? null,
    lavorazione_id: input.lavorazione_id ?? null,
    mezzo_id: input.mezzo_id ?? null,
    mezzo_snapshot: input.mezzo_snapshot ?? {},
    target_type: input.target_type ?? null,
    attrezzatura_id: input.attrezzatura_id ?? null,
    attrezzatura_snapshot: input.attrezzatura_snapshot ?? {},
    causale_trasporto: input.causale_trasporto ?? null,
    vettore: input.vettore ?? null,
    note: input.note ?? null,
    origine: input.origine ?? "preventivo",
    rows: input.rows.map((r, i) => ({
      ordine: i + 1,
      source_type: r.source_type,
      source_ref: r.source_ref,
      preventivo_id: r.preventivo_id ?? input.preventivo_id ?? null,
      descrizione: r.descrizione.trim(),
      codice: r.codice ?? null,
      quantita: r.quantita,
      unita_misura: r.unita_misura ?? "pz",
      note: r.note ?? null,
      meta: r.meta ?? {},
    })),
    links: (input.links ?? []).map((l) => ({
      source_type: l.source_type,
      source_id: l.source_id,
      meta: l.meta ?? {},
    })),
  };
}

async function persistDdtOfficialPdf(ddtId: string): Promise<void> {
  try {
    await fetch(`/api/ddt/${encodeURIComponent(ddtId)}/official-pdf`, {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // ponytail: best-effort; preview fallback rigenera on-demand
  }
}

export const ddtService = {
  async getList() {
    try {
      return fetchDdtListPayload(await sb());
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async fetchIndexByPreventivoIds(preventivoIds: readonly string[]): Promise<ServiceResult<DdtDocumentRow[]>> {
    try {
      const ids = [...new Set(preventivoIds.filter(Boolean))];
      if (ids.length === 0) return success([]);
      const c = await sb();
      const { data, error } = await c
        .from("ddt_documents")
        .select(DDT_DOCUMENTS_INDEX_COLUMNS)
        .in("preventivo_id", ids)
        .neq("status", "annullato")
        .order("created_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as DdtDocumentRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getActiveByPreventivoId(preventivoId: string): Promise<ServiceResult<DdtDocumentRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("ddt_documents")
        .select(DDT_DOCUMENTS_INDEX_COLUMNS)
        .eq("preventivo_id", preventivoId)
        .neq("status", "annullato")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return err(error.message);
      return success((data as DdtDocumentRow | null) ?? null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getDetail(id: string): Promise<ServiceResult<DdtDetail>> {
    try {
      const c = await sb();
      const { data: document, error } = await c.from("ddt_documents").select(DDT_DOCUMENTS_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!document) return err("DDT non trovato.");
      const [rows, links] = await Promise.all([
        c.from("ddt_rows").select(DDT_ROWS_COLUMNS).eq("ddt_id", id).order("ordine"),
        c.from("ddt_links").select(DDT_LINKS_COLUMNS).eq("ddt_id", id),
      ]);
      if (rows.error) return err(rows.error.message);
      if (links.error) return err(links.error.message);
      return success({ document, rows: rows.data ?? [], links: links.data ?? [] });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: DdtCreateInput): Promise<ServiceResult<{ id: string }>> {
    try {
      const c = await sb();
      const { data, error } = await c.rpc("create_ddt_with_rows", { p_payload: cleanPayload(input) });
      if (error) return err(error.message);
      const id = String(data);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "CREATE",
        payload: auditSnapshot({ cliente: input.cliente_label, origine: input.origine }),
      });
      void persistDdtOfficialPdf(id);
      return success({ id });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async createOrReplaceForPreventivo(input: DdtCreateInput): Promise<ServiceResult<{ id: string }>> {
    try {
      if (!input.preventivo_id) return err("preventivo_id obbligatorio.");
      const c = await sb();
      const { data: existingDdt } = await c
        .from("ddt_documents")
        .select("id")
        .eq("preventivo_id", input.preventivo_id)
        .neq("status", "annullato");
      const { data, error } = await c.rpc("replace_ddt_for_preventivo", { p_payload: cleanPayload(input) });
      if (error) return err(error.message);
      const id = String(data);
      for (const doc of existingDdt ?? []) {
        if (doc.id === id) continue;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: doc.id,
          azione: "UPDATE",
          payload: { action: "replaced_for_preventivo", preventivo_id: input.preventivo_id, replaced_by: id },
        });
      }
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "CREATE",
        payload: auditSnapshot({
          cliente: input.cliente_label,
          origine: input.origine,
          action: "replace_for_preventivo",
          preventivo_id: input.preventivo_id,
        }),
      });
      void persistDdtOfficialPdf(id);
      return success({ id });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async confirm(id: string): Promise<ServiceResult<void>> {
    try {
      const before = await this.getDetail(id);
      const c = await sb();
      const { error } = await c.rpc("confirm_ddt", { p_ddt_id: id });
      if (error) return err(error.message);
      if (before.success && before.data) {
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "UPDATE",
          payload: auditDiff(before.data.document, { status: "confermato" }),
        });
      }
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markStampato(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.rpc("mark_ddt_stampato", { p_ddt_id: id });
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: { action: "print" },
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markConsegnato(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.rpc("mark_ddt_consegnato", { p_ddt_id: id });
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: { action: "delivered" },
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async cancel(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.rpc("cancel_ddt", { p_ddt_id: id });
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: { action: "cancel" },
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async removeDraft(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { data: doc } = await c.from("ddt_documents").select("status").eq("id", id).maybeSingle();
      if (!doc || (doc as DdtDocumentRow).status !== "bozza") return err("Solo bozze eliminabili.");
      const { error } = await c.from("ddt_documents").delete().eq("id", id);
      if (error) return err(error.message);
      await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: {} });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
