import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Ore voce preventivo (collaudo, sanificazione, …) — default 1. */
export function normalizeOreVoce(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 1;
  return Math.max(0, Number(value) || 0);
}

export function normalizeCollaudoOre(value: number | null | undefined): number {
  return normalizeOreVoce(value);
}

export function normalizeSanificazioneOre(value: number | null | undefined): number {
  return normalizeOreVoce(value);
}

/** Prezzo unitario default: 1h di manodopera al prezzo orario cliente. */
export function defaultVocePrezzoManodopera(prezzoOrarioManodopera: number): number {
  return Math.max(0, Math.round(Number(prezzoOrarioManodopera) * 100) / 100 || 0);
}

/** Ore=1 e prezzo=0 → prezzo = prezzo orario manodopera (cliente). */
export function resolveVoceOrePrezzoManodopera(
  ore: number | null | undefined,
  prezzo: number | null | undefined,
  prezzoOrarioManodopera: number,
): number {
  const resolvedPrezzo = Math.max(0, Number(prezzo) || 0);
  const ref = defaultVocePrezzoManodopera(prezzoOrarioManodopera);
  if (resolvedPrezzo === 0 && ref > 0 && normalizeOreVoce(ore) === 1) return ref;
  return resolvedPrezzo;
}

export function totaleOrePrezzoVoce(
  ore: number | null | undefined,
  prezzo: number | null | undefined,
): number {
  const o = normalizeOreVoce(ore);
  const p = Math.max(0, Number(prezzo) || 0);
  return Math.round(o * p * 100) / 100;
}

export function totaleCollaudoPreventivo(p: Pick<PreventivoRecord, "collaudoOre" | "collaudoPrezzo">): number {
  return totaleOrePrezzoVoce(p.collaudoOre, p.collaudoPrezzo);
}

export function totaleSanificazionePreventivo(
  p: Pick<PreventivoRecord, "sanificazioneOre" | "sanificazionePrezzo">,
): number {
  return totaleOrePrezzoVoce(p.sanificazioneOre, p.sanificazionePrezzo);
}
