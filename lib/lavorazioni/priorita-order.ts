import type { PrioritaLavorazione } from "@/src/types/supabase-tables";

/** Ordine UI fisso: bassa → media → alta → urgente. */
export const PRIORITA_LAVORAZIONE_ORDER: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

const WEIGHT: Record<PrioritaLavorazione, number> = {
  bassa: 0,
  media: 1,
  alta: 2,
  urgente: 3,
};

export function prioritaSortWeight(p: string): number {
  if (p in WEIGHT) return WEIGHT[p as PrioritaLavorazione];
  return 99;
}

export function comparePrioritaLavorazione(a: string, b: string): number {
  return prioritaSortWeight(a) - prioritaSortWeight(b);
}

/** Elenchi da impostazioni globali ordinati per peso UI. */
export function orderPrioritaList(list: readonly PrioritaLavorazione[]): PrioritaLavorazione[] {
  return [...list].sort(comparePrioritaLavorazione);
}
