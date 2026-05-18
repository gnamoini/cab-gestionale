import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  LAVORAZIONI_STATI_CHIUSE,
  LAVORAZIONI_STATI_IN_CORSO,
} from "@/src/services/lavorazioni.service";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

/** Tutti gli stati ammessi dal database. */
export const ALL_DB_STATI_LAVORAZIONE: readonly StatoLavorazione[] = [
  ...LAVORAZIONI_STATI_IN_CORSO,
  ...LAVORAZIONI_STATI_CHIUSE,
];

const DB_STATI_SET = new Set<string>(ALL_DB_STATI_LAVORAZIONE);

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

export function isDbStatoLavorazione(id: string): id is StatoLavorazione {
  return DB_STATI_SET.has(id);
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
  const id = migrateStatoConfigId(statoId);
  return stati.find((s) => s.id === id)?.label ?? labelLavorazioneStatoDb(id as StatoLavorazione);
}
