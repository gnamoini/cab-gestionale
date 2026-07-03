import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { OperativeHistoryTier } from "./history-ranker";

export type MezzoSimilarityInput = {
  mezzoId?: string;
  cliente?: string;
  targa?: string;
  matricola?: string;
  marcaModello?: string;
};

const WEIGHTS = {
  sameMezzo: 1,
  sameCliente: 0.35,
  targa: 0.25,
  marca: 0.2,
  modello: 0.2,
};

export function scoreMezzoSimilarity(
  rec: PreventivoRecord,
  input: MezzoSimilarityInput,
): { score: number; tier: OperativeHistoryTier } {
  const targaMatch =
    input.targa && rec.targa && input.targa.trim().toLowerCase() === rec.targa.trim().toLowerCase();
  const matricolaMatch =
    input.matricola &&
    rec.matricola &&
    input.matricola.trim().toLowerCase() === rec.matricola.trim().toLowerCase();
  if (targaMatch || matricolaMatch) {
    return { score: WEIGHTS.sameMezzo, tier: "same_mezzo" };
  }
  const sameClient =
    input.cliente &&
    rec.cliente &&
    input.cliente.trim().toLowerCase() === rec.cliente.trim().toLowerCase();
  if (sameClient) return { score: 0.75, tier: "same_client" };
  return { score: 0.2, tier: "category" };
}
