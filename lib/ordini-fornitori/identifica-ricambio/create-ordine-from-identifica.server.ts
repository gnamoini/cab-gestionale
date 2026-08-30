import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import {
  buildIdentificaLineageMeta,
  extractPrezzoOrdineFromPayload,
  ordineMetaWithIdentificaLineage,
} from "@/lib/ordini-fornitori/identifica-ricambio/build-identifica-lineage-meta.server";
import { resolveIdentificaOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/resolve-candidate-to-prefill.server";
import {
  pickExistingOrdiniNumeri,
  stripClientIdentificaMeta,
  validateIdentificaOrderPayload,
} from "@/lib/ordini-fornitori/identifica-ricambio/validate-identifica-order.server";
import type { OrdineFornitoreCreateInput } from "@/lib/ordini-fornitori/types";
import { ORDINI_FORNITORI_COLUMNS } from "@/lib/db/table-select-columns";

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

export async function createOrdineFromIdentificaServer(
  sb: SupabaseClient,
  input: {
    userId: string;
    payload: OrdineFornitoreCreateInput;
    sourceSearchId: string;
    sourceCandidateId: string;
  },
): Promise<{ ordineId: string; numero: string | null }> {
  const { userId, payload, sourceSearchId, sourceCandidateId } = input;
  const settings = await resolveCabAppSettingsResolvedServer();
  const magazzinoMaster = settings.magazzinoMaster;

  const { data: ordiniRows } = await sb.from("ordini_fornitori").select("numero");
  const existingOrdini = pickExistingOrdiniNumeri(ordiniRows ?? []);

  const resolved = await resolveIdentificaOrderPrefill(sb, {
    searchId: sourceSearchId,
    candidateId: sourceCandidateId,
    userId,
    magazzinoMaster,
    existingOrdini,
  });

  const validationErrors = validateIdentificaOrderPayload({
    payload,
    prefill: resolved.prefill,
    sourceSearchId,
    sourceCandidateId,
  });
  if (validationErrors.length) {
    throw new Error(validationErrors.join(" "));
  }

  const prezzoOrdine = extractPrezzoOrdineFromPayload(payload);
  const lineage = buildIdentificaLineageMeta({
    prefill: resolved.prefill,
    ordineId: "",
    prezzoOrdine,
    createdBy: userId,
  });

  const safeMeta = stripClientIdentificaMeta(payload.meta as Record<string, unknown> | undefined);
  const payloadWithLineage: OrdineFornitoreCreateInput = {
    ...payload,
    meta: ordineMetaWithIdentificaLineage(safeMeta, { ...lineage, ordineId: "" }),
  };

  const { data: ordineId, error } = await sb.rpc("create_ordine_fornitore_with_righe", {
    p_payload: cleanCreatePayload(payloadWithLineage),
  });
  if (error) throw new Error(error.message);
  const id = typeof ordineId === "string" ? ordineId.trim() : String(ordineId ?? "").trim();
  if (!id) throw new Error("Creazione ordine senza id restituito.");

  const finalLineage = buildIdentificaLineageMeta({
    prefill: resolved.prefill,
    ordineId: id,
    prezzoOrdine,
    createdBy: userId,
  });
  await sb
    .from("ordini_fornitori")
    .update({ meta: ordineMetaWithIdentificaLineage(safeMeta, finalLineage) })
    .eq("id", id);

  await sb
    .from("ai_part_searches")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: userId,
      confirmed_candidate_id: sourceCandidateId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceSearchId)
    .eq("created_by", userId);

  const { data: ordineRow } = await sb
    .from("ordini_fornitori")
    .select(ORDINI_FORNITORI_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return { ordineId: id, numero: ordineRow?.numero ? String(ordineRow.numero) : null };
}
