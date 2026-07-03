import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import { scoreLavorazioneSimilarity } from "./lavorazione-similarity";
import { scoreMezzoSimilarity } from "./mezzo-similarity";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export type OperativeHistoryTier =
  | "same_mezzo"
  | "same_client"
  | "similar_mezzo"
  | "category"
  | "none";

export type OperativeHistoryCandidate = {
  caseId: string;
  tier: OperativeHistoryTier;
  mezzoScore: number;
  lavorazioneScore: number;
  qualityScore: number;
  frequencyScore: number;
  recencyScore: number;
  confirmedWeight: number;
  finalScore: number;
  clientDescription: string;
  technicalBlob: string;
  lines: string[];
};

export type OperativeHistoryInput = {
  technicalBlob: string;
  anomaliaText?: string;
  mezzoId?: string;
  cliente?: string;
  marcaModello?: string;
  ctx: DescrizionePreventivoContext;
};

const MIN_CLIENT_CASES = 3;
const CLIENT_BOOST = 1.25;
const MIN_HISTORY_SIM = 0.45;

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function mezzoScoreForRecord(
  rec: PreventivoRecord,
  input: OperativeHistoryInput,
): { score: number; tier: OperativeHistoryTier } {
  return scoreMezzoSimilarity(rec, {
    mezzoId: input.mezzoId,
    cliente: input.cliente,
    targa: input.ctx.targa,
    matricola: input.ctx.matricola,
    marcaModello: input.marcaModello,
  });
}

function lavorazioneScore(tech: string, input: OperativeHistoryInput): number {
  return scoreLavorazioneSimilarity(input.technicalBlob, tech);
}

function recencyScore(updatedAt?: string): number {
  if (!updatedAt) return 0.3;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const halfLife = 18 * 30 * 24 * 3600 * 1000;
  return Math.exp((-ageMs * Math.LN2) / halfLife);
}

/** Ranking contestuale da preventivi storici in ctx (sync, client-safe). */
export function rankOperativeHistoryFromContext(input: OperativeHistoryInput): OperativeHistoryCandidate[] {
  const records = input.ctx.existingPreventiviRecords ?? [];
  const candidates: OperativeHistoryCandidate[] = [];

  for (const rec of records) {
    if (input.ctx.lavorazioneId && rec.lavorazioneId === input.ctx.lavorazioneId) continue;
    const tech = rec.descrizioneLavorazioniTecnicaSorgente?.trim() ?? "";
    const client = rec.descrizioneLavorazioniCliente?.trim() ?? "";
    if (!tech || !client) continue;

    const lavScore = lavorazioneScore(tech, input);
    if (lavScore < 0.35) continue;

    const { score: mezzoS, tier } = mezzoScoreForRecord(rec, input);
    const lines = parseLines(client);
    const qualityScore = 0.8;
    const frequencyScore = 0.5;
    const recency = recencyScore(rec.aggiornatoAt);
    const confirmedWeight = 1;

    let finalScore =
      0.25 * lavScore +
      0.25 * mezzoS +
      0.1 * qualityScore +
      0.05 * frequencyScore +
      0.05 * recency +
      0.1 * confirmedWeight;

    const clientCases = candidates.filter((c) => c.tier === "same_client").length;
    if (tier === "same_client" && clientCases >= MIN_CLIENT_CASES) {
      finalScore *= CLIENT_BOOST;
    }

    candidates.push({
      caseId: rec.id,
      tier,
      mezzoScore: mezzoS,
      lavorazioneScore: lavScore,
      qualityScore,
      frequencyScore,
      recencyScore: recency,
      confirmedWeight,
      finalScore,
      clientDescription: client,
      technicalBlob: tech,
      lines,
    });
  }

  return candidates.sort((a, b) => b.finalScore - a.finalScore);
}

export function pickHistorySourceType(tier: OperativeHistoryTier): import("../types").DescriptionSourceType {
  switch (tier) {
    case "same_mezzo":
      return "history_same_mezzo";
    case "same_client":
      return "history_same_client";
    case "similar_mezzo":
      return "history_similar_mezzo";
    case "category":
      return "history_similar_intervento";
    default:
      return "history_similar_intervento";
  }
}

export function shouldPreferHistory(
  topHistory: OperativeHistoryCandidate | undefined,
  tkbScore: number,
): boolean {
  if (!topHistory) return false;
  return topHistory.finalScore > tkbScore && topHistory.lavorazioneScore >= MIN_HISTORY_SIM;
}

export { MIN_HISTORY_SIM };
