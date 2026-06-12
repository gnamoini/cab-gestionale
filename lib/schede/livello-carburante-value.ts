import { LIVELLO_CARBURANTE_OPTIONS } from "@/lib/schede/livello-carburante-options";

const LEGACY_PERCENT: Record<(typeof LIVELLO_CARBURANTE_OPTIONS)[number], number> = {
  Vuoto: 0,
  "1/4": 25,
  "1/2": 50,
  "3/4": 75,
  Pieno: 100,
};

/** Scorciatoie UI (percentuale + etichetta storica). */
export const LIVELLO_CARBURANTE_PRESETS = LIVELLO_CARBURANTE_OPTIONS.map((label) => ({
  label,
  percent: LEGACY_PERCENT[label],
}));

/** Valore persistito → percentuale 0–100, oppure `null` se non impostato / non riconosciuto. */
export function parseLivelloCarburantePercent(raw: string | undefined | null): number | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (t in LEGACY_PERCENT) return LEGACY_PERCENT[t as keyof typeof LEGACY_PERCENT];
  const m = t.match(/^(\d{1,3})\s*%?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

export function livelloCarburanteToStored(percent: number): string {
  const n = Math.round(Math.min(100, Math.max(0, percent)));
  return `${n}%`;
}

/** Canonicalizza valore persistito (legacy, numerico, con/senza %). */
export function normalizeLivelloCarburanteStored(raw: string | undefined | null): string {
  const p = parseLivelloCarburantePercent(raw);
  if (p === null) return "";
  return `${p}%`;
}

/** Etichetta leggibile (PDF, panoramica, timeline). */
export function formatLivelloCarburanteDisplay(raw: string | undefined | null): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  const p = parseLivelloCarburantePercent(t);
  if (p === null) return t;
  return `${p}%`;
}
