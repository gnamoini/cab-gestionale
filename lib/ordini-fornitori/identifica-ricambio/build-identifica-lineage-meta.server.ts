import "server-only";

import type { IdentificaRicambioLineageMeta, SparePartOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/types";
import type { OrdineFornitoreCreateInput } from "@/lib/ordini-fornitori/types";

export function buildIdentificaLineageMeta(input: {
  prefill: SparePartOrderPrefill;
  ordineId: string;
  prezzoOrdine: number;
  createdBy: string;
}): IdentificaRicambioLineageMeta {
  return {
    sourceSearchId: input.prefill.sourceSearchId,
    sourceCandidateId: input.prefill.sourceCandidateId,
    sourceDocumentId: input.prefill.sourceDocumentId,
    sourceCodice: input.prefill.sourceCodice,
    prezzoSuggerito: input.prefill.prezzoSuggerito,
    prezzoSource: input.prefill.prezzoSource,
    prezzoOrdine: input.prezzoOrdine,
    fornitoreMode: input.prefill.fornitoreMode,
    ordineCreatedAt: new Date().toISOString(),
    createdBy: input.createdBy,
    ordineId: input.ordineId,
  };
}

export function ordineMetaWithIdentificaLineage(
  existing: Record<string, unknown> | undefined,
  lineage: IdentificaRicambioLineageMeta,
): Record<string, unknown> {
  return { ...(existing ?? {}), identificaRicambio: lineage };
}

export function extractPrezzoOrdineFromPayload(payload: OrdineFornitoreCreateInput): number {
  const riga = payload.righe[0];
  return riga ? Number(riga.prezzo_unitario) || 0 : 0;
}
