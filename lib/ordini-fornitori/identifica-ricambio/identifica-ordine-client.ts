import type { IdentificaOrderPrefillResponse } from "@/lib/ordini-fornitori/identifica-ricambio/types";
import type { OrdineFornitoreCreateInput } from "@/lib/ordini-fornitori/types";

export type IdentificaCandidateListResponse = {
  candidates: Array<{ id: string; rankOrder: number; isBestMatch: boolean }>;
};

export async function fetchIdentificaCandidates(searchId: string): Promise<IdentificaCandidateListResponse> {
  const res = await fetch(`/api/identifica-ricambio/searches/${searchId}/candidates`);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Impossibile caricare i candidati.");
  }
  return res.json() as Promise<IdentificaCandidateListResponse>;
}

export async function resolveIdentificaOrderPrefillClient(
  searchId: string,
  candidateId: string,
): Promise<IdentificaOrderPrefillResponse> {
  const res = await fetch(`/api/identifica-ricambio/searches/${searchId}/resolve-order-prefill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Prefill ordine non disponibile.");
  }
  return res.json() as Promise<IdentificaOrderPrefillResponse>;
}

export async function createOrdineFromIdentificaClient(input: {
  sourceSearchId: string;
  sourceCandidateId: string;
  payload: OrdineFornitoreCreateInput;
}): Promise<{ ordineId: string; numero: string | null }> {
  const res = await fetch("/api/ordini-fornitori/from-identifica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceSearchId: input.sourceSearchId,
      sourceCandidateId: input.sourceCandidateId,
      record: input.payload,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Salvataggio ordine non riuscito.");
  }
  return res.json() as Promise<{ ordineId: string; numero: string | null }>;
}
