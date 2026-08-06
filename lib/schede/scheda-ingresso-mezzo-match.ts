import { scoreCaptureIdentAgainstTarget, type CaptureIdent } from "@/lib/document-capture/capture-lavorazione-match";
import { captureFieldValuesEquivalent } from "@/lib/document-capture/capture-ingresso-field-hints";
import { mezzoGestitoToCandidate, type MezzoCandidate } from "@/lib/domain/mezzo/mezzo-resolution";
import {
  findMezziByMatricola,
  findMezziByScuderia,
  findMezziByTarga,
  findMezziByVin,
} from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoLinkOrigin =
  | "selected_by_user"
  | "auto_confirmed"
  | "created_new"
  | "unresolved_duplicate";

export type MatchConfidence = "certain" | "high" | "medium" | "low" | "ambiguous";

export type IngressoMezzoMatchReason = {
  matchedFields: string[];
  score: number;
  confidence: MatchConfidence;
};

export type IngressoMezzoScoredCandidate = {
  mezzo: MezzoGestito;
  score: number;
  matchedFields: string[];
  confidence: MatchConfidence;
};

export type IngressoMezzoMatchResult =
  | { status: "not_found" }
  | {
      status: "needs_confirm";
      candidate: IngressoMezzoScoredCandidate;
      candidates: IngressoMezzoScoredCandidate[];
      reason: IngressoMezzoMatchReason;
    }
  | {
      status: "ambiguous";
      candidates: IngressoMezzoScoredCandidate[];
      reason?: IngressoMezzoMatchReason;
    };

export type SchedaIngressoMezzoLinkMeta = {
  origin: MezzoLinkOrigin;
  confirmed: boolean;
  mezzoId: string | null;
  candidateIds?: string[];
  resolvedAt: string;
  reason?: IngressoMezzoMatchReason;
};

const STRONG_GAP_THRESHOLD = 20;
const CLIENTE_BONUS = 8;
const MARCA_MODELLO_BONUS = 4;

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function schedaToCaptureIdent(scheda: SchedaIngressoFields): CaptureIdent {
  return {
    targa: scheda.targa,
    matricola: scheda.matricola,
    nScuderia: scheda.nScuderia,
    vin: scheda.vin,
    cliente: scheda.cliente,
  };
}

function targetFromMezzo(mezzo: MezzoGestito) {
  return {
    targa: mezzo.targa,
    matricola: mezzo.matricola,
    nScuderia: mezzo.numeroScuderia ?? "",
    vin: mezzo.vin ?? "",
  };
}

function softBonus(scheda: SchedaIngressoFields, mezzo: MezzoGestito): {
  bonus: number;
  fields: string[];
} {
  let bonus = 0;
  const fields: string[] = [];
  const schedaCliente = safeStr(scheda.cliente);
  const mezzoCliente = safeStr(mezzo.cliente);
  if (
    schedaCliente &&
    mezzoCliente &&
    captureFieldValuesEquivalent(schedaCliente, mezzoCliente, { standardizeLegalSuffix: true })
  ) {
    bonus += CLIENTE_BONUS;
    fields.push("cliente");
  }
  const marca = safeStr(mezzo.marca);
  const modello = safeStr(mezzo.modello);
  if (marca && marca !== "—") {
    bonus += MARCA_MODELLO_BONUS;
    fields.push("marca");
  }
  if (modello && modello !== "—") {
    fields.push("modello");
  }
  return { bonus, fields };
}

function parseMatchedFields(reason: string[]): string[] {
  return reason.map((r) => r.split(":")[0] ?? r);
}

function classifyCandidateConfidence(
  matchedFields: string[],
  scheda: SchedaIngressoFields,
  mezzo: MezzoGestito,
  allScored: IngressoMezzoScoredCandidate[],
): MatchConfidence {
  const hasVin = matchedFields.includes("vin");
  const hasTarga = matchedFields.includes("targa");
  const hasMatricola = matchedFields.includes("matricola");
  const hasScuderia = matchedFields.includes("nScuderia");
  const hasCliente =
    matchedFields.includes("cliente") ||
    (safeStr(scheda.cliente) &&
      safeStr(mezzo.cliente) &&
      captureFieldValuesEquivalent(scheda.cliente, mezzo.cliente, { standardizeLegalSuffix: true }));

  if (hasVin) {
    const vinHits = allScored.filter((c) => c.matchedFields.includes("vin")).length;
    if (vinHits === 1) return "certain";
  }
  if (hasTarga) {
    const targaHits = allScored.filter((c) => c.matchedFields.includes("targa")).length;
    if (targaHits === 1) return "high";
  }
  if (hasMatricola && hasCliente) return "medium";
  if (hasScuderia) {
    const scuderiaHits = allScored.filter((c) => c.matchedFields.includes("nScuderia")).length;
    if (scuderiaHits > 1) return "ambiguous";
    return "low";
  }
  if (hasMatricola) return "medium";
  return "low";
}

function scoreMezzoAgainstScheda(
  scheda: SchedaIngressoFields,
  mezzo: MezzoGestito,
): IngressoMezzoScoredCandidate | null {
  const ident = schedaToCaptureIdent(scheda);
  const scored = scoreCaptureIdentAgainstTarget(ident, targetFromMezzo(mezzo));
  if (!scored) return null;

  const soft = softBonus(scheda, mezzo);
  const matchedFields = [...parseMatchedFields(scored.reason), ...soft.fields];

  return {
    mezzo,
    score: scored.score + soft.bonus,
    matchedFields,
    confidence: "low",
  };
}

/** Fase 1 — riduce il pool (catalogo in memoria o subset pre-filtrato). */
export function collectMezzoCandidates(input: {
  scheda: SchedaIngressoFields;
  catalog: readonly MezzoGestito[];
}): MezzoGestito[] {
  const { scheda, catalog } = input;
  const seen = new Set<string>();
  const out: MezzoGestito[] = [];

  const pushUnique = (list: readonly MezzoGestito[]) => {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  };

  pushUnique(findMezziByTarga(catalog, scheda.targa));
  pushUnique(findMezziByVin(catalog, scheda.vin));
  pushUnique(findMezziByMatricola(catalog, scheda.matricola));
  pushUnique(findMezziByScuderia(catalog, scheda.nScuderia));

  const schedaCliente = safeStr(scheda.cliente);
  if (schedaCliente && out.length < 20) {
    for (const m of catalog) {
      if (seen.has(m.id)) continue;
      const mc = safeStr(m.cliente);
      if (!mc || mc === "—") continue;
      if (captureFieldValuesEquivalent(schedaCliente, mc, { standardizeLegalSuffix: true })) {
        seen.add(m.id);
        out.push(m);
      }
    }
  }

  return out;
}

/** Fase 2 — pure scorer su candidati già filtrati. */
export function scoreIngressoMezzoCandidates(input: {
  scheda: SchedaIngressoFields;
  candidates: readonly MezzoGestito[];
}): IngressoMezzoMatchResult {
  const { scheda, candidates } = input;
  const raw: IngressoMezzoScoredCandidate[] = [];

  for (const mezzo of candidates) {
    const scored = scoreMezzoAgainstScheda(scheda, mezzo);
    if (scored) raw.push(scored);
  }

  if (raw.length === 0) return { status: "not_found" };

  raw.sort((a, b) => b.score - a.score);

  const withConfidence = raw.map((c) => ({
    ...c,
    confidence: classifyCandidateConfidence(c.matchedFields, scheda, c.mezzo, raw),
  }));

  const top = withConfidence[0]!;
  const second = withConfidence[1];
  const gap = second ? top.score - second.score : top.score;

  const reason: IngressoMezzoMatchReason = {
    matchedFields: top.matchedFields,
    score: top.score,
    confidence: top.confidence,
  };

  const ambiguousByConfidence = top.confidence === "ambiguous";
  const ambiguousByGap =
    second != null && second.score > 0 && gap < STRONG_GAP_THRESHOLD;

  if (ambiguousByConfidence || ambiguousByGap) {
    return {
      status: "ambiguous",
      candidates: withConfidence,
      reason,
    };
  }

  return {
    status: "needs_confirm",
    candidate: top,
    candidates: withConfidence,
    reason,
  };
}

/** Collector + scorer — convenienza client. */
export function resolveIngressoMezzoMatchFromCatalog(
  scheda: SchedaIngressoFields,
  catalog: readonly MezzoGestito[],
): IngressoMezzoMatchResult {
  const candidates = collectMezzoCandidates({ scheda, catalog });
  return scoreIngressoMezzoCandidates({ scheda, candidates });
}

export function ingressoMatchToMezzoCandidates(
  candidates: readonly IngressoMezzoScoredCandidate[],
): MezzoCandidate[] {
  return candidates.map((c) =>
    mezzoGestitoToCandidate(c.mezzo, c.matchedFields, c.score),
  );
}

export function describeIngressoMezzoMatchConfidence(confidence: MatchConfidence): string {
  switch (confidence) {
    case "certain":
      return "identificativo certo (VIN)";
    case "high":
      return "identificativo certo (targa)";
    case "medium":
      return "compatibile (matricola e cliente)";
    case "low":
      return "possibile compatibilità";
    case "ambiguous":
      return "più mezzi compatibili";
  }
}
