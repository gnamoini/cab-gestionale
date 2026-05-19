import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  LAVORAZIONI_STATI_CHIUSE,
  LAVORAZIONI_STATI_IN_CORSO,
} from "@/src/services/lavorazioni.service";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

/** Tutti gli stati ammessi dal database (TypeScript / app). */
export const ALL_DB_STATI_LAVORAZIONE: readonly StatoLavorazione[] = [
  ...LAVORAZIONI_STATI_IN_CORSO,
  ...LAVORAZIONI_STATI_CHIUSE,
];

/** Enum base Postgres (sempre validi in filtri Supabase, senza slot custom). */
export const UNIVERSAL_SAFE_STATI_LAVORAZIONE: readonly StatoLavorazione[] = [
  "bozza",
  "in_coda",
  "in_officina",
  "in_attesa_ricambi",
  "completata",
  "consegnata",
  "annullata",
];

/** Slot custom opzionali (richiedono migrazione enum dedicata). */
export const OPTIONAL_CUSTOM_STATI_SLOTS: readonly StatoLavorazione[] = ["custom_1", "custom_2", "custom_3"];

export const CLIENT_PORTAL_FALLBACK_STATO: StatoLavorazione = "bozza";

const DB_STATI_SET = new Set<string>(ALL_DB_STATI_LAVORAZIONE);
const UNIVERSAL_SAFE_SET = new Set<string>(UNIVERSAL_SAFE_STATI_LAVORAZIONE);

/** Migrazione id stati legacy (mock / impostazioni vecchie) → enum Supabase. */
export const LEGACY_STATO_ID_TO_DB: Record<string, StatoLavorazione> = {
  "lav-stato-accettazione": "bozza",
  "lav-stato-att-prev": "in_coda",
  "lav-stato-att-ricambi": "in_attesa_ricambi",
  "lav-stato-da-lavorare": "in_coda",
  "lav-stato-in-lavorazione": "in_officina",
  [LAVORAZIONE_STATO_COMPLETATA_ID]: "completata",
};

/** Default impostazioni allineati all'enum DB (label + colori). */
export const DEFAULT_STATI_LAVORAZIONI_DB: StatoLavorazioneConfig[] = [
  { id: "bozza", label: "Bozza", color: "#52525b" },
  { id: "in_coda", label: "In coda", color: "#ea580c" },
  { id: "in_officina", label: "In officina", color: "#0284c7" },
  { id: "in_attesa_ricambi", label: "In attesa ricambi", color: "#7c3aed" },
  { id: "completata", label: "Completata", color: "#15803d" },
  { id: "consegnata", label: "Consegnata", color: "#059669" },
];

/** Enum DB non ancora presenti nella lista configurata (per “Aggiungi stato”). */
export function statiEnumDisponibiliDaAggiungere(
  configured: StatoLavorazioneConfig[],
): StatoLavorazioneConfig[] {
  const configuredIds = new Set(configured.map((s) => migrateStatoConfigId(s.id)));
  return ALL_DB_STATI_LAVORAZIONE.filter((id) => id !== "annullata" && !configuredIds.has(id)).map((id) => ({
    id,
    label: labelLavorazioneStatoDb(id),
    color: DEFAULT_STATI_LAVORAZIONI_DB.find((s) => s.id === id)?.color,
  }));
}

export const STATO_LAVORAZIONE_COMPLETATA_DB = "completata" as const;

export function isDbStatoLavorazione(id: string): id is StatoLavorazione {
  return DB_STATI_SET.has(id);
}

/** Solo enum base: sicuro per `.in("stato", [...])` su Postgres senza migrazione custom. */
export function isQuerySafeStatoForSupabaseFilter(id: string): id is StatoLavorazione {
  return UNIVERSAL_SAFE_SET.has(id);
}

/** Mappa id settings/legacy → enum DB; fallback su `bozza` se non valido. */
export function resolveStatoToDbEnum(
  raw: string,
  fallback: StatoLavorazione = CLIENT_PORTAL_FALLBACK_STATO,
): StatoLavorazione {
  const migrated = migrateStatoConfigId(raw.trim());
  if (isDbStatoLavorazione(migrated)) return migrated;
  return fallback;
}

export function migrateStatoConfigId(id: string): string {
  const t = id.trim();
  if (isDbStatoLavorazione(t)) return t;
  return LEGACY_STATO_ID_TO_DB[t] ?? t;
}

export function migrateStatiConfigList(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const merged = new Map<string, StatoLavorazioneConfig>();
  for (const s of stati) {
    const dbId = migrateStatoConfigId(s.id);
    if (!isDbStatoLavorazione(dbId)) continue;
    const prev = merged.get(dbId);
    merged.set(dbId, {
      id: dbId,
      label: s.label?.trim() || prev?.label || labelLavorazioneStatoDb(dbId),
      color: s.color ?? prev?.color,
    });
  }
  return [...merged.values()];
}

/** Stati lavorazione esposti dalla UI: solo quelli configurati in app_settings. */
export function buildStatiLavorazioniOptions(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): StatoLavorazioneConfig[] {
  return migrateStatiConfigList(settingsStati ?? []).filter((s) => s.id !== "annullata");
}

export function statiLavorazioniInCorsoOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const set = new Set<string>(LAVORAZIONI_STATI_IN_CORSO);
  return stati.filter((s) => set.has(s.id));
}

export function statiLavorazioniChiusiOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const set = new Set<string>(LAVORAZIONI_STATI_CHIUSE);
  return stati.filter((s) => set.has(s.id));
}

export function statiLavorazioniRapidiOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return [...statiLavorazioniInCorsoOptions(stati), ...statiLavorazioniChiusiOptions(stati)];
}

export function statoLavorazioneLabel(
  statoId: string,
  stati: StatoLavorazioneConfig[],
): string {
  const id = resolveStatoToDbEnum(statoId);
  return stati.find((s) => s.id === id)?.label ?? labelLavorazioneStatoDb(id);
}
