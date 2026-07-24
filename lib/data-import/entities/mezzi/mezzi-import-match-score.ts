import { normalizeVin } from "@/lib/mezzi/vin-normalize";

export const MEZZI_IMPORT_SCORE = {
  externalMezzoId: 200,
  vin: 100,
  targa: 50,
  matricola: 50,
  scuderia: 10,
  cliente: 5,
  marca: 5,
  modello: 5,
} as const;

export const MEZZI_IMPORT_UPDATE_THRESHOLD = 100;

export type MezziImportMatchInput = {
  mezzoId?: string;
  targa?: string;
  matricola?: string;
  numero_scuderia?: string;
  telaio?: string;
  cliente?: string;
  marca?: string;
  modello?: string;
};

export type MezziImportExistingMezzo = {
  id: string;
  targa?: string | null;
  matricola?: string | null;
  numero_scuderia?: string | null;
  telaio_num?: string | null;
  cliente?: string | null;
  marca?: string | null;
  modello?: string | null;
};

export type MezziImportExistingAttrezzatura = {
  mezzo_id: string;
  matricola?: string | null;
};

export type MezziImportMatchCandidate = {
  mezzoId: string;
  score: number;
  signals: string[];
  label?: string;
};

function norm(v: string): string {
  return v.trim().toLowerCase();
}

function scoreMezzoImportMatch(
  row: MezziImportMatchInput,
  existing: MezziImportExistingMezzo,
  attMatricola?: string | null,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  if (row.mezzoId?.trim() && row.mezzoId.trim() === existing.id) {
    score += MEZZI_IMPORT_SCORE.externalMezzoId;
    signals.push("mezzo_id:exact");
  }

  const vin = row.telaio ? normalizeVin(row.telaio) : null;
  const existingVin = existing.telaio_num ? normalizeVin(existing.telaio_num) : null;
  if (vin && existingVin && vin === existingVin) {
    score += MEZZI_IMPORT_SCORE.vin;
    signals.push("vin:exact");
  }

  if (row.targa?.trim() && existing.targa && norm(row.targa) === norm(existing.targa)) {
    score += MEZZI_IMPORT_SCORE.targa;
    signals.push("targa:exact");
  }

  const rowMat = row.matricola?.trim();
  const legacyMat = existing.matricola?.trim();
  const attMat = attMatricola?.trim();
  if (rowMat) {
    if (attMat && norm(rowMat) === norm(attMat)) {
      score += MEZZI_IMPORT_SCORE.matricola;
      signals.push("matricola_attrezzatura:exact");
    } else if (legacyMat && norm(rowMat) === norm(legacyMat)) {
      score += MEZZI_IMPORT_SCORE.matricola;
      signals.push("matricola_legacy:exact");
    }
  }

  if (
    row.numero_scuderia?.trim() &&
    existing.numero_scuderia &&
    norm(row.numero_scuderia) === norm(existing.numero_scuderia)
  ) {
    score += MEZZI_IMPORT_SCORE.scuderia;
    signals.push("scuderia:exact");
  }

  if (row.cliente?.trim() && existing.cliente && norm(row.cliente) === norm(existing.cliente)) {
    score += MEZZI_IMPORT_SCORE.cliente;
    signals.push("cliente:exact");
  }
  if (row.marca?.trim() && existing.marca && norm(row.marca) === norm(existing.marca)) {
    score += MEZZI_IMPORT_SCORE.marca;
    signals.push("marca:exact");
  }
  if (row.modello?.trim() && existing.modello && norm(row.modello) === norm(existing.modello)) {
    score += MEZZI_IMPORT_SCORE.modello;
    signals.push("modello:exact");
  }

  return { score, signals };
}

export type MezziImportMatchResult =
  | { kind: "none"; candidates: [] }
  | { kind: "suggest_update"; candidate: MezziImportMatchCandidate }
  | { kind: "manual_review"; candidates: MezziImportMatchCandidate[] };

/** Scoring non distruttivo — mai dedup automatico su segnali deboli. */
export function matchMezziImportRow(
  row: MezziImportMatchInput,
  existingMezzi: readonly MezziImportExistingMezzo[],
  existingAtt: readonly MezziImportExistingAttrezzatura[],
): MezziImportMatchResult {
  const attByMezzo = new Map<string, string>();
  for (const a of existingAtt) {
    if (a.matricola?.trim()) attByMezzo.set(a.mezzo_id, a.matricola.trim());
  }

  const candidates: MezziImportMatchCandidate[] = [];
  for (const m of existingMezzi) {
    const { score, signals } = scoreMezzoImportMatch(row, m, attByMezzo.get(m.id));
    if (score <= 0) continue;
    candidates.push({
      mezzoId: m.id,
      score,
      signals,
      label: m.targa ?? m.numero_scuderia ?? m.id,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.mezzoId.localeCompare(b.mezzoId));

  if (candidates.length === 0) return { kind: "none", candidates: [] };

  const top = candidates[0]!;
  const aboveThreshold = candidates.filter((c) => c.score >= MEZZI_IMPORT_UPDATE_THRESHOLD);

  if (aboveThreshold.length === 1 && top.score >= MEZZI_IMPORT_UPDATE_THRESHOLD) {
    return { kind: "suggest_update", candidate: top };
  }
  if (aboveThreshold.length > 1) {
    return { kind: "manual_review", candidates: aboveThreshold };
  }
  if (candidates.length === 1 && top.score < MEZZI_IMPORT_UPDATE_THRESHOLD) {
    return { kind: "manual_review", candidates };
  }
  if (candidates.length > 1) {
    return { kind: "manual_review", candidates };
  }

  return { kind: "none", candidates: [] };
}
