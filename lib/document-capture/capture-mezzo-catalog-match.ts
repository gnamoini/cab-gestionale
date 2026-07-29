import type { CaptureIdent } from "@/lib/document-capture/capture-lavorazione-match";
import { scoreCaptureIdentAgainstTarget } from "@/lib/document-capture/capture-lavorazione-match";
import { captureFieldValuesEquivalent } from "@/lib/document-capture/capture-ingresso-field-hints";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoLookupIdent } from "@/lib/schede/scheda-ingresso-ident-match";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";

export type MatchStrength = "exact_identity" | "strong" | "weak" | "none";

export type CaptureMezzoMatchReasonField =
  | "targa"
  | "matricola"
  | "nScuderia"
  | "vin"
  | "cliente"
  | "marca"
  | "modello";

export type CaptureMezzoMatchReasonType =
  | "exact"
  | "normalized"
  | "missing_in_registry"
  | "missing_in_scan"
  | "conflict";

export type CaptureMezzoMatchReason = {
  field: CaptureMezzoMatchReasonField;
  type: CaptureMezzoMatchReasonType;
  scannedValue: string;
  catalogValue: string;
};

export type CaptureMezzoMatchCandidate = {
  mezzo: MezzoGestito;
  score: number;
  percentage: number;
  matchStrength: MatchStrength;
  reasons: CaptureMezzoMatchReason[];
};

const IDENTITY_WEIGHTS = {
  targa: 100,
  matricola: 90,
  nScuderia: 80,
  vin: 70,
} as const;

const STRONG_GAP_THRESHOLD = 20;
const STRONG_PERCENT_THRESHOLD = 80;

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function targetFromMezzo(mezzo: MezzoGestito): SchedaIngressoLookupIdent {
  return {
    targa: mezzo.targa,
    matricola: mezzo.matricola,
    nScuderia: mezzo.numeroScuderia ?? "",
    vin: mezzo.vin ?? "",
  };
}

function identityWeightProvided(ident: CaptureIdent): number {
  let sum = 0;
  if (safeStr(ident.targa)) sum += IDENTITY_WEIGHTS.targa;
  if (safeStr(ident.matricola)) sum += IDENTITY_WEIGHTS.matricola;
  if (safeStr(ident.nScuderia)) sum += IDENTITY_WEIGHTS.nScuderia;
  if (safeStr(ident.vin)) sum += IDENTITY_WEIGHTS.vin;
  return sum;
}

function buildIdentityReasons(
  ident: CaptureIdent,
  mezzo: MezzoGestito,
  scoredReason: string[],
): CaptureMezzoMatchReason[] {
  const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
  const reasons: CaptureMezzoMatchReason[] = [];

  const identityFields: Array<{
    field: CaptureMezzoMatchReasonField;
    scan: string;
    catalog: string;
  }> = [
    { field: "targa", scan: ident.targa, catalog: fromMezzo.targa },
    { field: "matricola", scan: ident.matricola, catalog: fromMezzo.matricola },
    { field: "nScuderia", scan: ident.nScuderia, catalog: fromMezzo.nScuderia },
    { field: "vin", scan: ident.vin, catalog: fromMezzo.vin },
  ];

  for (const { field, scan, catalog } of identityFields) {
    const s = safeStr(scan);
    const c = safeStr(catalog);
    if (!s && !c) continue;
    if (!s && c) {
      reasons.push({ field, type: "missing_in_scan", scannedValue: "", catalogValue: c });
      continue;
    }
    if (s && !c) {
      reasons.push({ field, type: "missing_in_registry", scannedValue: s, catalogValue: "" });
      continue;
    }
    const matched = scoredReason.some((r) => r.startsWith(`${field === "nScuderia" ? "nScuderia" : field}:`));
    reasons.push({
      field,
      type: matched ? "exact" : "conflict",
      scannedValue: s,
      catalogValue: c,
    });
  }

  if (safeStr(ident.cliente) && safeStr(mezzo.cliente)) {
    const equiv = captureFieldValuesEquivalent(ident.cliente, mezzo.cliente, {
      standardizeLegalSuffix: true,
    });
    reasons.push({
      field: "cliente",
      type: equiv ? "exact" : "conflict",
      scannedValue: ident.cliente,
      catalogValue: mezzo.cliente,
    });
  }

  if (safeStr(ident.cliente) && safeStr(mezzo.marca)) {
    reasons.push({
      field: "marca",
      type: captureFieldValuesEquivalent(mezzo.marca, mezzo.marca) ? "exact" : "normalized",
      scannedValue: "",
      catalogValue: mezzo.marca,
    });
  }

  if (safeStr(mezzo.modello) && mezzo.modello !== "—") {
    reasons.push({
      field: "modello",
      type: "exact",
      scannedValue: "",
      catalogValue: mezzo.modello,
    });
  }

  return reasons;
}

function softTieBreakScore(ident: CaptureIdent, mezzo: MezzoGestito): number {
  let bonus = 0;
  if (safeStr(ident.cliente) && safeStr(mezzo.cliente)) {
    if (captureFieldValuesEquivalent(ident.cliente, mezzo.cliente, { standardizeLegalSuffix: true })) {
      bonus += 5;
    }
  }
  return bonus;
}

function classifyMatchStrength(
  ident: CaptureIdent,
  candidate: { score: number; percentage: number },
  allCandidates: Array<{ score: number; percentage: number }>,
  isUniqueExact: boolean,
): MatchStrength {
  if (candidate.score <= 0) return "none";
  const hasIdentityMatch = candidate.score > 0;
  if (!hasIdentityMatch) return "weak";

  if (isUniqueExact) return "exact_identity";

  const second = allCandidates[1];
  const gap = second ? candidate.score - second.score : candidate.score;
  if (
    candidate.percentage >= STRONG_PERCENT_THRESHOLD &&
    gap >= STRONG_GAP_THRESHOLD
  ) {
    return "strong";
  }

  if (identityWeightProvided(ident) === 0) return "weak";
  return hasIdentityMatch ? "strong" : "weak";
}

/** Hash stabile per invalidare draft se OCR/candidato cambia. */
export function hashCaptureMezzoMatchReasons(reasons: readonly CaptureMezzoMatchReason[]): string {
  return reasons
    .map((r) => `${r.field}:${r.type}:${r.scannedValue}:${r.catalogValue}`)
    .sort()
    .join("|");
}

/** Scoring interno — importare solo da resolveCaptureMezzoMatch. */
export function scoreCaptureMezzoCandidates(
  ident: CaptureIdent,
  mezziCatalog: readonly MezzoGestito[],
): CaptureMezzoMatchCandidate[] {
  const weightDenom = identityWeightProvided(ident);
  if (weightDenom === 0) return [];

  const raw: CaptureMezzoMatchCandidate[] = [];

  for (const mezzo of mezziCatalog) {
    const scored = scoreCaptureIdentAgainstTarget(ident, targetFromMezzo(mezzo));
    if (!scored) continue;

    const percentage = Math.round((scored.score / weightDenom) * 100);
    const reasons = buildIdentityReasons(ident, mezzo, scored.reason);
    const bonus = softTieBreakScore(ident, mezzo);

    raw.push({
      mezzo,
      score: scored.score + bonus,
      percentage,
      matchStrength: "weak",
      reasons,
    });
  }

  raw.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.percentage - a.percentage;
  });

  const top = raw[0];
  const isUniqueExact =
    raw.length === 1 &&
    top != null &&
    top.reasons.some((r) =>
      ["targa", "matricola", "vin"].includes(r.field) && r.type === "exact",
    );

  return raw.map((c, idx) => ({
    ...c,
    matchStrength: classifyMatchStrength(
      ident,
      c,
      raw,
      isUniqueExact && idx === 0,
    ),
  }));
}

export function formatCaptureMezzoMatchPercent(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

export function isCaptureMezzoMatchAutoSuggest(strength: MatchStrength): boolean {
  return strength === "exact_identity" || strength === "strong";
}
