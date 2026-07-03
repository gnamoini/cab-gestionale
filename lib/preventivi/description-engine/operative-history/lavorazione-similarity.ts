import { tokenSimilarity } from "@/lib/preventivi/preventivi-descrizione-quality";

export function scoreLavorazioneSimilarity(technicalBlob: string, historicalTech: string): number {
  return tokenSimilarity(historicalTech, technicalBlob);
}
