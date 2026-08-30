import "server-only";

import type { OrdineFornitoreCreateInput, OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { SparePartOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/types";

export function validateIdentificaOrderPayload(input: {
  payload: OrdineFornitoreCreateInput;
  prefill: SparePartOrderPrefill;
  sourceSearchId: string;
  sourceCandidateId: string;
}): string[] {
  const errors: string[] = [];
  const { payload, prefill, sourceSearchId, sourceCandidateId } = input;

  if (sourceSearchId !== prefill.sourceSearchId) {
    errors.push("searchId non coerente.");
  }
  if (sourceCandidateId !== prefill.sourceCandidateId) {
    errors.push("candidateId non coerente.");
  }

  const riga = payload.righe[0];
  if (!riga) {
    errors.push("Almeno una riga ordine richiesta.");
    return errors;
  }

  if (prefill.resolution.matchKind === "exact" && prefill.resolution.ricambioId) {
    if (riga.ricambio_id && riga.ricambio_id !== prefill.resolution.ricambioId) {
      errors.push("ricambioId non coerente con la resolution.");
    }
  }

  if (!payload.fornitore_label.trim()) {
    errors.push("Fornitore obbligatorio.");
  }

  if (!riga.descrizione.trim()) {
    errors.push("Descrizione riga obbligatoria.");
  }

  return errors;
}

export function stripClientIdentificaMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  const { identificaRicambio, ...rest } = meta;
  void identificaRicambio;
  return rest;
}

export function pickExistingOrdiniNumeri(
  rows: Array<{ numero: string | null }>,
): Pick<OrdineFornitoreRecord, "numero">[] {
  return rows.map((r) => ({ numero: String(r.numero ?? "") }));
}
