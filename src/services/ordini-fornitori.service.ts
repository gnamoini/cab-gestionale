"use client";

import {
  ORDINI_FORNITORI_COLUMNS,
  ORDINI_FORNITORI_RIGHE_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  fetchOrdiniFornitoriListPayload,
  mapOrdiniFornitoriListToRecords,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-fetch";
import { mapOrdineFornitoreRow } from "@/lib/ordini-fornitori/ordine-fornitore-db-mapper";
import type {
  OrdineFornitoreCreateInput,
  OrdineFornitoreDeliveryInput,
  OrdineFornitoreDeliveryResult,
  OrdineFornitoreRecord,
  OrdineFornitoreStatus,
  OrdineFornitoreUpdateInput,
} from "@/lib/ordini-fornitori/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "ordini_fornitori";

async function sb() {
  return getBrowserSupabase();
}

function cleanRighe(righe: OrdineFornitoreCreateInput["righe"]) {
  return righe.map((r, i) => ({
    ordine: i + 1,
    ricambio_id: r.ricambio_id ?? null,
    codice: r.codice ?? null,
    descrizione: r.descrizione.trim(),
    quantita: r.quantita,
    prezzo_unitario: r.prezzo_unitario,
    sconto_percent: r.sconto_percent ?? 0,
    meta: r.meta ?? {},
  }));
}

function cleanCreatePayload(input: OrdineFornitoreCreateInput): Record<string, unknown> {
  return {
    status: input.status ?? "bozza",
    data_ordine: input.data_ordine,
    fornitore_label: input.fornitore_label.trim(),
    fornitore_snapshot: input.fornitore_snapshot ?? {},
    destinazione: input.destinazione ?? null,
    destinazione_snapshot: input.destinazione_snapshot ?? {},
    logistica_snapshot: input.logistica_snapshot ?? {},
    note: input.note ?? null,
    trasporto: input.trasporto ?? 0,
    iva_percent: input.iva_percent ?? 22,
    lavorazione_id: input.lavorazione_id ?? null,
    preventivo_id: input.preventivo_id ?? null,
    scheda_lavorazione_id: input.scheda_lavorazione_id ?? null,
    meta: input.meta ?? {},
    righe: cleanRighe(input.righe),
  };
}

function cleanUpdatePayload(input: OrdineFornitoreUpdateInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.data_ordine !== undefined) payload.data_ordine = input.data_ordine;
  if (input.status !== undefined) payload.status = input.status;
  if (input.fornitore_label !== undefined) payload.fornitore_label = input.fornitore_label.trim();
  if (input.fornitore_snapshot !== undefined) payload.fornitore_snapshot = input.fornitore_snapshot;
  if (input.destinazione !== undefined) payload.destinazione = input.destinazione;
  if (input.destinazione_snapshot !== undefined) payload.destinazione_snapshot = input.destinazione_snapshot;
  if (input.logistica_snapshot !== undefined) payload.logistica_snapshot = input.logistica_snapshot;
  if (input.note !== undefined) payload.note = input.note;
  if (input.trasporto !== undefined) payload.trasporto = input.trasporto;
  if (input.iva_percent !== undefined) payload.iva_percent = input.iva_percent;
  if (input.meta !== undefined) payload.meta = input.meta;
  if (input.righe !== undefined) payload.righe = cleanRighe(input.righe);
  return payload;
}

export const ordiniFornitoriService = {
  async getList(): Promise<ServiceResult<OrdineFornitoreRecord[]>> {
    try {
      const res = await fetchOrdiniFornitoriListPayload(await sb());
      if (!res.success || !res.data) return err(res.error ?? "Errore caricamento ordini.");
      return success(mapOrdiniFornitoriListToRecords(res.data));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getDetail(id: string): Promise<ServiceResult<OrdineFornitoreRecord>> {
    try {
      const c = await sb();
      const { data: ordine, error } = await c
        .from("ordini_fornitori")
        .select(ORDINI_FORNITORI_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) return err(error.message);
      if (!ordine) return err("Ordine non trovato.");
      const { data: righe, error: righeErr } = await c
        .from("ordini_fornitori_righe")
        .select(ORDINI_FORNITORI_RIGHE_COLUMNS)
        .eq("ordine_id", id)
        .order("ordine");
      if (righeErr) return err(righeErr.message);
      return success(mapOrdineFornitoreRow(ordine as OrdineFornitoreRow, (righe ?? []) as OrdineFornitoreRigaRow[]));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: OrdineFornitoreCreateInput): Promise<ServiceResult<OrdineFornitoreRecord>> {
    try {
      const c = await sb();
      const { data, error } = await c.rpc("create_ordine_fornitore_with_righe", {
        p_payload: cleanCreatePayload(input),
      });
      if (error) return err(error.message);
      const id = typeof data === "string" ? data.trim() : data == null ? "" : String(data).trim();
      if (!id) return err("Creazione ordine senza id restituito.");

      const detail = await ordiniFornitoriService.getDetail(id);
      if (!detail.success || !detail.data) {
        return err(detail.error ?? "Ordine creato ma non recuperabile per l'elenco.");
      }

      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "CREATE",
        payload: auditSnapshot({ fornitore: input.fornitore_label }),
      });
      return success(detail.data);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateDraft(
    id: string,
    input: OrdineFornitoreUpdateInput,
    expectedUpdatedAt?: string,
  ): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.rpc("update_ordine_fornitore_draft", {
        p_id: id,
        p_payload: cleanUpdatePayload(input),
        p_expected_updated_at: expectedUpdatedAt ?? null,
      });
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditSnapshot(input),
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async annulla(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.rpc("annulla_ordine_fornitore", { p_id: id });
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditSnapshot({ status: "annullato" }),
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateStatus(
    id: string,
    status: OrdineFornitoreStatus,
    expectedUpdatedAt?: string,
  ): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { data: beforeRow, error: fetchErr } = await c
        .from("ordini_fornitori")
        .select("id, status, numero, fornitore_label, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) return err(fetchErr.message);
      if (!beforeRow) return err("Ordine non trovato.");
      if (beforeRow.status === "annullato") return err("Ordine annullato.");
      if (beforeRow.status === status) return success(undefined);

      const { error } = await c.rpc("ordine_fornitore_transition_status", {
        p_id: id,
        p_new_status: status,
        p_expected_updated_at: expectedUpdatedAt ?? null,
      });
      if (error) return err(error.message);

      const oggetto = [beforeRow.numero, beforeRow.fornitore_label].filter(Boolean).join(" — ") || id;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(
          { status: beforeRow.status, numero: beforeRow.numero, fornitore_label: beforeRow.fornitore_label },
          { status, numero: beforeRow.numero, fornitore_label: beforeRow.fornitore_label },
          auditContext(oggetto),
        ),
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async deleteOrdine(id: string): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { data: beforeRow, error: fetchErr } = await c
        .from("ordini_fornitori")
        .select("id, numero, fornitore_label, status")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) return err(fetchErr.message);
      if (!beforeRow) return err("Ordine non trovato.");

      const { error } = await c.from("ordini_fornitori").delete().eq("id", id);
      if (error) return err(error.message);

      const oggetto = [beforeRow.numero, beforeRow.fornitore_label].filter(Boolean).join(" — ") || id;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot({
          numero: beforeRow.numero,
          fornitore_label: beforeRow.fornitore_label,
          status: beforeRow.status,
          oggetto,
        }),
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async receiveDelivery(
    id: string,
    input: OrdineFornitoreDeliveryInput,
  ): Promise<ServiceResult<OrdineFornitoreDeliveryResult>> {
    try {
      const res = await fetch(`/api/ordini-fornitori/${encodeURIComponent(id)}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json()) as OrdineFornitoreDeliveryResult & { error?: string };
      if (!res.ok) return err(body.error ?? "Ricezione non riuscita.");
      return success(body);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
