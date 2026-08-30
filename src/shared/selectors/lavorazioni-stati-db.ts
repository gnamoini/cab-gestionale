import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  addStatoFromLabel,
  CLIENT_PORTAL_FALLBACK_STATO,
  DEFAULT_LAVORAZIONE_STATO_ID,
  DEFAULT_STATI_LAVORAZIONI_DB,
  DEFAULT_STATI_LAVORAZIONI_WORKFLOW,
  isStatoClosed,
  isStatoInConfig,
  migrateStatoConfigId,
  normalizeStatiList,
  reorderStatiList,
  resolveDefaultLavorazioneStatoId,
  resolveStatoId,
  slugifyStatoId,
  STATO_LAVORAZIONE_COMPLETATA_DB,
  STATO_LAVORAZIONE_COMPLETATA_ID,
  statiChiusiFromConfig,
  statiInCorsoFromConfig,
  statoLavorazioneLabel,
} from "@/lib/lavorazioni/stati-dynamic";

export {
  addStatoFromLabel,
  CLIENT_PORTAL_FALLBACK_STATO,
  DEFAULT_LAVORAZIONE_STATO_ID,
  DEFAULT_STATI_LAVORAZIONI_DB,
  DEFAULT_STATI_LAVORAZIONI_WORKFLOW,
  migrateStatoConfigId,
  normalizeStatiList,
  reorderStatiList,
  resolveDefaultLavorazioneStatoId,
  resolveStatoId,
  slugifyStatoId,
  STATO_LAVORAZIONE_COMPLETATA_DB,
  STATO_LAVORAZIONE_COMPLETATA_ID,
  statoLavorazioneLabel,
};

/** @deprecated Usare isStatoInConfig(id, stati). */
export function isDbStatoLavorazione(id: string): boolean {
  return migrateStatoConfigId(id.trim()).length > 0;
}

/** @deprecated Non più necessario con colonna TEXT. */
export function isQuerySafeStatoForSupabaseFilter(id: string): boolean {
  return id.trim().length > 0;
}

/** @deprecated Usare resolveStatoId. */
export function resolveStatoToDbEnum(raw: string, fallback?: string): string {
  return resolveStatoId(raw, DEFAULT_STATI_LAVORAZIONI_WORKFLOW, fallback ?? CLIENT_PORTAL_FALLBACK_STATO);
}

export function migrateStatiConfigList(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return normalizeStatiList(stati);
}

export function buildStatiLavorazioniOptions(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): StatoLavorazioneConfig[] {
  const list = normalizeStatiList(settingsStati ?? DEFAULT_STATI_LAVORAZIONI_WORKFLOW);
  return list.length ? list : [...DEFAULT_STATI_LAVORAZIONI_WORKFLOW];
}

export function statiLavorazioniInCorsoOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return statiInCorsoFromConfig(stati);
}

export function statiLavorazioniChiusiOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return statiChiusiFromConfig(stati);
}

export function statiLavorazioniRapidiOptions(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return [...statiInCorsoFromConfig(stati), ...statiChiusiFromConfig(stati)];
}

/** @deprecated Enum pool rimosso — aggiunta libera in impostazioni. */
export function statiEnumDisponibiliDaAggiungere(): StatoLavorazioneConfig[] {
  return [];
}

export { isStatoClosed, isStatoInConfig };
