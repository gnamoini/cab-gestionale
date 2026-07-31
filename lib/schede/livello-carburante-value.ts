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

const SNAP_PRESET_PERCENTS = LIVELLO_CARBURANTE_PRESETS.map((p) => p.percent);
/** ponytail: accoppiato a `.livello-carburante-range` thumb width in globals-core.css. */
export const LIVELLO_CARBURANTE_THUMB_SIZE = "1.25rem";
/** ponytail: soglia magnetica — oltre questa distanza resta il valore libero. */
const SNAP_THRESHOLD = 6;

/** Centro thumb/dot/fill per percentuale 0–100 (allineato al range nativo). */
export function livelloCarburanteThumbCenterCss(percent: number): string {
  const p = Math.min(100, Math.max(0, percent));
  return `calc(0.5 * ${LIVELLO_CARBURANTE_THUMB_SIZE} + (${p} / 100) * (100% - ${LIVELLO_CARBURANTE_THUMB_SIZE}))`;
}

/** ponytail: equivalente pixel della formula thumb-center (test / debug). */
export function livelloCarburanteThumbCenterPx(
  percent: number,
  trackWidthPx: number,
  thumbWidthPx: number,
): number {
  const p = Math.min(100, Math.max(0, percent));
  return thumbWidthPx / 2 + (p / 100) * (trackWidthPx - thumbWidthPx);
}

/** Arrotonda verso il preset più vicino se entro soglia, altrimenti percentuale intera 0–100. */
export function snapLivelloCarburantePercent(raw: number): number {
  const n = Math.round(Math.min(100, Math.max(0, raw)));
  for (const preset of SNAP_PRESET_PERCENTS) {
    if (Math.abs(n - preset) <= SNAP_THRESHOLD) return preset;
  }
  return n;
}

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
