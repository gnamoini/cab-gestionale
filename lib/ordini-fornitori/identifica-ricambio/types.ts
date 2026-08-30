export type FornitorePrefillMode = "identified" | "suggested" | "none";

export type PrezzoSourceType = "magazzino" | "catalogo" | "listino" | "web" | "unknown";

export type CandidatePartResolution = {
  candidateId: string;
  ricambioId: string | null;
  matchKind: "exact" | "ambiguous" | "none";
};

export type SparePartOrderPrefill = {
  codice: string | null;
  descrizione: string;
  quantita: number;
  note: string | null;
  prezzoSuggerito: number | null;
  prezzoSource: { type: PrezzoSourceType; label: string | null };
  fornitoreLabel: string | null;
  fornitoreMode: FornitorePrefillMode;
  resolution: CandidatePartResolution;
  source: "identifica-ricambio";
  sourceSearchId: string;
  sourceCandidateId: string;
  sourceDocumentId: string | null;
  sourceCodice: string | null;
};

export type IdentificaRicambioLineageMeta = {
  sourceSearchId: string;
  sourceCandidateId: string;
  sourceDocumentId: string | null;
  sourceCodice: string | null;
  prezzoSuggerito: number | null;
  prezzoSource: { type: PrezzoSourceType; label: string | null };
  prezzoOrdine: number;
  fornitoreMode: FornitorePrefillMode;
  ordineCreatedAt: string;
  createdBy: string;
  ordineId: string;
};

export type IdentificaOrderPrefillResponse = {
  prefill: SparePartOrderPrefill;
  record: import("@/lib/ordini-fornitori/types").OrdineFornitoreRecord;
  warnings: string[];
};

export type IdentificaCandidateListItem = {
  id: string;
  rankOrder: number;
  isBestMatch: boolean;
};

export type OrdineFornitoreEditorIdentificaMeta = {
  fornitoreMode: FornitorePrefillMode;
  fornitoreNeedsVerification: boolean;
  prezzoSuggerito: number | null;
  prezzoSource: { type: PrezzoSourceType; label: string | null };
  prefillWarnings?: string[];
  saveContext: { sourceSearchId: string; sourceCandidateId: string };
};
