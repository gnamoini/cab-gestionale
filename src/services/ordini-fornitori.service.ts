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
  OrdineFornitoreRecord,
  OrdineFornitoreUpdateInput,
} from "@/lib/ordini-fornitori/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionDelete, ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
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
    note: input.note ?? null,
    trasporto: input.trasporto ?? 0,
    iva_percent: input.iva_percent ?? 22,
    lavorazione_id: input.lavorazione_id ?? null,
    preventivo_id: input.preventivo_id ?? null,
    scheda_lavorazione_id: input.scheda_lavorazione_id ?? null,
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
  if (input.note !== undefined) payload.note = input.note;
  if (input.trasporto !== undefined) payload.trasporto = input.trasporto;
  if (input.iva_percent !== undefined) payload.iva_percent = input.iva_percent;
  if (input.righe !== undefined) payload.righe = cleanRighe(input.righe);
  return payload;
}

export const ordiniFornitoriService = {
  async getList(): Promise<ServiceResult<OrdineFornitoreRecord[]>> {
    try {
      const allowed = await ensureSectionRead("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const res = await fetchOrdiniFornitoriListPayload(await sb());
      if (!res.success || !res.data) return err(res.error ?? "Errore caricamento ordini.");
      return success(mapOrdiniFornitoriListToRecords(res.data));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getDetail(id: string): Promise<ServiceResult<OrdineFornitoreRecord>> {
    try {
      const allowed = await ensureSectionRead("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
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

  async create(input: OrdineFornitoreCreateInput): Promise<ServiceResult<{ id: string }>> {
    try {
      const allowed = await ensureSectionWrite("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c.rpc("create_ordine_fornitore_with_righe", {
        p_payload: cleanCreatePayload(input),
      });
      if (error) return err(error.message);
      const id = String(data);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "CREATE",
        payload: auditSnapshot({ fornitore: input.fornitore_label }),
      });
      return success({ id });
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
      const allowed = await ensureSectionWrite("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
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
      const allowed = await ensureSectionWrite("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
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

  async deleteBozza(id: string): Promise<ServiceResult<void>> {
    try {
      const allowed = await ensureSectionDelete("ordini_fornitori");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { error } = await c.from("ordini_fornitori").delete().eq("id", id).eq("status", "bozza");
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot({}),
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
