import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidatePart, PartEvidence } from "@/lib/ai/spare-parts/types/schemas";
import {
  buildPartEvidenceNotes,
  partCatalogDescription,
  partCodeLabel,
  primarySourceDocumentId,
  resolvePartPrice,
} from "@/lib/ai/spare-parts/part-candidate-display";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { fetchMagazzinoListAuthorizedServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { fornitoreModeFromMatch } from "@/lib/ordini-fornitori/identifica-ricambio/fornitore-prefill-mode";
import { mapPrefillToOrdineRecord } from "@/lib/ordini-fornitori/identifica-ricambio/map-prefill-to-ordine-record";
import {
  fornitoreHintFromPart,
  prezzoSourceFromEvidence,
} from "@/lib/ordini-fornitori/identifica-ricambio/prezzo-source";
import { resolveRicambioMatch } from "@/lib/ordini-fornitori/identifica-ricambio/resolve-ricambio-match";
import type {
  IdentificaOrderPrefillResponse,
  SparePartOrderPrefill,
} from "@/lib/ordini-fornitori/identifica-ricambio/types";
import { lookupFornitoreByPivaCfName } from "@/lib/ordini-fornitori/import/lookup-fornitore";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

type CandidateRow = {
  id: string;
  search_id: string;
  rank_order: number;
  candidate_part_number: string | null;
  verified_part_number: string | null;
  manufacturer: string | null;
  description: string | null;
  compatibility_json: unknown;
  price_candidate: unknown;
  verified_price: unknown;
  confidence_score: number | null;
  confidence_band: string | null;
  is_best_match: boolean;
};

type EvidenceRow = {
  evidence_type: string;
  document_id: string | null;
  page_number: number | null;
  position_number: string | null;
  url: string | null;
  title: string;
  excerpt: string | null;
  priority: number | null;
};

function evidenceRowToPart(ev: EvidenceRow): PartEvidence {
  return {
    type: ev.evidence_type as PartEvidence["type"],
    documentId: ev.document_id ?? undefined,
    pageNumber: ev.page_number ?? undefined,
    positionNumber: ev.position_number ?? undefined,
    url: ev.url ?? undefined,
    title: ev.title,
    excerpt: ev.excerpt ?? undefined,
    priority: ev.priority ?? undefined,
  };
}

export function candidateRowToPart(row: CandidateRow, evidence: EvidenceRow[]): CandidatePart {
  return {
    candidatePartNumber: row.candidate_part_number,
    verifiedPartNumber: row.verified_part_number,
    manufacturer: row.manufacturer,
    description: row.description ?? "",
    compatibility: Array.isArray(row.compatibility_json)
      ? (row.compatibility_json as CandidatePart["compatibility"])
      : [],
    priceCandidate: (row.price_candidate as CandidatePart["priceCandidate"]) ?? null,
    verifiedPrice: (row.verified_price as CandidatePart["verifiedPrice"]) ?? null,
    confidenceScore: Number(row.confidence_score) || 0,
    confidenceBand: (row.confidence_band as CandidatePart["confidenceBand"]) ?? "low",
    evidence: evidence.map(evidenceRowToPart),
  };
}

export function buildSparePartOrderPrefill(input: {
  part: CandidatePart;
  searchId: string;
  candidateId: string;
  magazzinoItems: readonly RicambioMagazzino[];
  magazzinoMaster: MagazzinoMasterPrefs;
}): { prefill: SparePartOrderPrefill; warnings: string[]; fornitoreSnapshotProposal?: import("@/lib/ordini-fornitori/fornitore-snapshot").OrdineFornitoreFornitoreSnapshot } {
  const { part, searchId, candidateId, magazzinoItems, magazzinoMaster } = input;
  const warnings: string[] = [];
  const codice = partCodeLabel(part);
  const price = resolvePartPrice(part);
  const resolution = resolveRicambioMatch(magazzinoItems, codice, candidateId);

  if (resolution.matchKind === "ambiguous") {
    warnings.push("Codice presente su più ricambi in magazzino — collegamento anagrafica non applicato.");
  }
  if (!codice) warnings.push("Codice ricambio non disponibile — verifica manuale consigliata.");

  const hint = fornitoreHintFromPart(part);
  const fornitoreMatch = lookupFornitoreByPivaCfName({ ragioneSociale: hint ?? "" }, magazzinoMaster, 0.5);
  let fornitoreMode = fornitoreModeFromMatch(fornitoreMatch.matched, fornitoreMatch.matchMethod, Boolean(hint));

  let fornitoreLabel: string | null = null;
  if (fornitoreMode === "identified") {
    fornitoreLabel = fornitoreMatch.label;
  } else if (fornitoreMode === "suggested") {
    fornitoreLabel = fornitoreMatch.matched ? fornitoreMatch.label : hint;
    if (!fornitoreLabel?.trim()) fornitoreMode = "none";
  }

  const prefill: SparePartOrderPrefill = {
    codice,
    descrizione: partCatalogDescription(part),
    quantita: 1,
    note: buildPartEvidenceNotes(part),
    prezzoSuggerito: price && Number.isFinite(price.amount) ? price.amount : null,
    prezzoSource: prezzoSourceFromEvidence(price, part.evidence),
    fornitoreLabel: fornitoreMode === "none" ? null : fornitoreLabel,
    fornitoreMode,
    resolution,
    source: "identifica-ricambio",
    sourceSearchId: searchId,
    sourceCandidateId: candidateId,
    sourceDocumentId: primarySourceDocumentId(part),
    sourceCodice: codice,
  };

  if (fornitoreMode === "suggested" && !fornitoreMatch.matched) {
    warnings.push("Fornitore suggerito dall'identificazione — verifica prima di inviare l'ordine.");
  }
  if (prefill.prezzoSuggerito == null) {
    warnings.push("Prezzo non disponibile dall'identificazione.");
  }

  return {
    prefill,
    warnings,
    fornitoreSnapshotProposal: fornitoreMatch.snapshotProposal,
  };
}

export async function resolveIdentificaOrderPrefill(
  sb: SupabaseClient,
  input: {
    searchId: string;
    candidateId: string;
    userId: string;
    magazzinoMaster: MagazzinoMasterPrefs;
    existingOrdini: readonly Pick<OrdineFornitoreRecord, "numero">[];
  },
): Promise<IdentificaOrderPrefillResponse> {
  const { searchId, candidateId, userId, magazzinoMaster, existingOrdini } = input;

  const { data: search, error: searchErr } = await sb
    .from("ai_part_searches")
    .select("id, created_by, status")
    .eq("id", searchId)
    .maybeSingle();
  if (searchErr) throw new Error(searchErr.message);
  if (!search) throw new Error("Ricerca non trovata.");
  if (search.created_by !== userId) throw new Error("Permesso negato.");
  if (search.status !== "completed") throw new Error("Ricerca non ancora completata.");

  const { data: candRow, error: candErr } = await sb
    .from("ai_part_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("search_id", searchId)
    .maybeSingle();
  if (candErr) throw new Error(candErr.message);
  if (!candRow) throw new Error("Candidato non trovato.");

  const { data: evidenceRows, error: evErr } = await sb
    .from("ai_part_evidence")
    .select("evidence_type, document_id, page_number, position_number, url, title, excerpt, priority")
    .eq("candidate_id", candidateId);
  if (evErr) throw new Error(evErr.message);

  const part = candidateRowToPart(candRow as CandidateRow, (evidenceRows ?? []) as EvidenceRow[]);

  const magRes = await fetchMagazzinoListAuthorizedServer(undefined, "list");
  const magazzinoItems: RicambioMagazzino[] =
    magRes.success && magRes.data
      ? mapMagazzinoRowsToUI(magRes.data as MagazzinoRicambioRow[])
      : [];

  const built = buildSparePartOrderPrefill({
    part,
    searchId,
    candidateId,
    magazzinoItems,
    magazzinoMaster,
  });

  const record = mapPrefillToOrdineRecord({
    prefill: built.prefill,
    magazzinoMaster,
    existingOrdini,
    fornitoreSnapshotProposal: built.fornitoreSnapshotProposal,
  });

  return { prefill: built.prefill, record, warnings: built.warnings };
}
