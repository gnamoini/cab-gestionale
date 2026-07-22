import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { PrioritaLav } from "@/lib/lavorazioni/types";

/** Ordine UI fisso: bassa → media → alta → urgente. */
export const PRIORITA_LAVORAZIONE_ORDER: PrioritaLav[] = ["bassa", "media", "alta", "urgente"];

const OFFICIAL_PRIORITA = new Set<PrioritaLav>(PRIORITA_LAVORAZIONE_ORDER);

const WEIGHT: Record<PrioritaLav, number> = {
  bassa: 0,
  media: 1,
  alta: 2,
  urgente: 3,
};

/** Enum DB legacy (migrazione a bassa/media/alta/urgente) — solo lettura dati storici. */
const LEGACY_PRIORITA_ALIASES: Record<string, PrioritaLavorazione> = {
  normale: "media",
};

/** SSOT write: qualsiasi input → enum ufficiale; default media. */
export function normalizePrioritaLavorazione(input: unknown): PrioritaLav {
  if (typeof input !== "string") return "media";
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "media";
  if (OFFICIAL_PRIORITA.has(trimmed as PrioritaLav)) return trimmed as PrioritaLav;
  return "media";
}

/** Guard finale prima di insert/update lavorazione. */
export function assertValidPriorita(value: unknown): PrioritaLav {
  return normalizePrioritaLavorazione(value);
}

export function prioritaSortWeight(p: string): number {
  const normalized = LEGACY_PRIORITA_ALIASES[p] ?? p;
  if (normalized in WEIGHT) return WEIGHT[normalized as PrioritaLav];
  return 99;
}

export function comparePrioritaLavorazione(a: string, b: string): number {
  return prioritaSortWeight(a) - prioritaSortWeight(b);
}

/** Elenchi da impostazioni globali ordinati per peso UI. */
export function orderPrioritaList(list: readonly PrioritaLavorazione[]): PrioritaLavorazione[] {
  return [...list].sort(comparePrioritaLavorazione);
}
