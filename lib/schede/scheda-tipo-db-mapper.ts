/** Valori enum Postgres `tipo_scheda_lavorazione` (migration 20260211120000). */
export const SCHEDA_TIPO_DB = ["ingresso", "interventi", "ricambi"] as const;

export type SchedaTipoDb = (typeof SCHEDA_TIPO_DB)[number];

/** Chiavi bundle UI / JSON doc (`types/schede.ts`). */
export type SchedaBundleKey = "ingresso" | "lavorazioni" | "ricambi";

const DB_TO_BUNDLE: Record<SchedaTipoDb, SchedaBundleKey> = {
  ingresso: "ingresso",
  interventi: "lavorazioni",
  ricambi: "ricambi",
};

const BUNDLE_TO_DB: Record<SchedaBundleKey, SchedaTipoDb> = {
  ingresso: "ingresso",
  lavorazioni: "interventi",
  ricambi: "ricambi",
};

/** Alias legacy letti da DB/API (mai scritti in insert). */
const DB_TIPO_ALIASES: Record<string, SchedaTipoDb> = {
  intervento: "interventi",
};

export function isSchedaTipoDb(value: string): value is SchedaTipoDb {
  return (SCHEDA_TIPO_DB as readonly string[]).includes(value);
}

/** Normalizza valore enum da DB/API; alias `intervento` → `interventi`. */
export function normalizeSchedaTipoDb(raw: string): SchedaTipoDb | null {
  const t = raw.trim();
  if (!t) return null;
  if (isSchedaTipoDb(t)) return t;
  return DB_TIPO_ALIASES[t] ?? null;
}

export function bundleKeyToDbTipo(key: SchedaBundleKey): SchedaTipoDb {
  return BUNDLE_TO_DB[key];
}

export function dbTipoToBundleKey(tipo: string): SchedaBundleKey | null {
  const normalized = normalizeSchedaTipoDb(tipo);
  if (!normalized) return null;
  return DB_TO_BUNDLE[normalized];
}
