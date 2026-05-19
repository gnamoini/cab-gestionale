import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import {
  buildStatiLavorazioniOptions,
  CLIENT_PORTAL_FALLBACK_STATO,
  isDbStatoLavorazione,
  isQuerySafeStatoForSupabaseFilter,
  migrateStatoConfigId,
  resolveStatoToDbEnum,
  statiLavorazioniInCorsoOptions,
  STATO_LAVORAZIONE_COMPLETATA_DB,
} from "@/src/shared/selectors/lavorazioni-stati-db";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

/** Stati chiusi esclusi dal portale clienti (lista in corso). */
export const CLIENT_PORTAL_CLOSED_STATI: readonly StatoLavorazione[] = ["consegnata", "annullata"];

const CLOSED_SET = new Set<string>(CLIENT_PORTAL_CLOSED_STATI);

function warnInvalidStato(raw: string, context: string): void {
  if (typeof console !== "undefined") {
    console.warn(
      `[lavorazioni-clienti] Stato non valido o non sincronizzato "${raw}" (${context}) → fallback "${CLIENT_PORTAL_FALLBACK_STATO}"`,
    );
  }
}

/** Opzioni stato per UI portale: solo id enum DB validi da global settings. */
export function filterClientPortalStatiOptions(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): StatoLavorazioneConfig[] {
  return buildStatiLavorazioniOptions(settingsStati).filter((s) => {
    const id = migrateStatoConfigId(s.id);
    return isDbStatoLavorazione(id);
  });
}

/** Insieme stati ammessi in lista clienti (settings in-corso + completata). */
export function buildClientPortalVisibleStatiSet(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): Set<StatoLavorazione> {
  const configured = statiLavorazioniInCorsoOptions(buildStatiLavorazioniOptions(settingsStati));
  const ids = configured
    .map((s) => migrateStatoConfigId(s.id))
    .filter((id) => isDbStatoLavorazione(id)) as StatoLavorazione[];

  const set = new Set<StatoLavorazione>(ids);
  set.add(STATO_LAVORAZIONE_COMPLETATA_DB);
  return set;
}

/** Normalizza `stato` su una riga lavorazione (legacy / valori corrotti → enum sicuro). */
export function sanitizeClientLavorazioneRow(row: LavorazioneListRow): LavorazioneListRow {
  const raw = row.stato;
  const resolved = resolveStatoToDbEnum(raw);
  if (raw !== resolved && !isDbStatoLavorazione(raw)) {
    warnInvalidStato(raw, `lavorazione ${row.id}`);
  }
  return resolved === raw ? row : { ...row, stato: resolved };
}

export function isClientPortalOpenStato(stato: string): boolean {
  const resolved = resolveStatoToDbEnum(stato);
  return !CLOSED_SET.has(resolved);
}

/** Riga visibile in portale clienti: aperta e (se configurato) tra gli stati globali. */
export function isClientPortalVisibleRow(
  row: LavorazioneListRow,
  visibleStati: Set<StatoLavorazione>,
): boolean {
  const stato = resolveStatoToDbEnum(row.stato);
  if (CLOSED_SET.has(stato)) return false;
  if (visibleStati.size === 0) return true;
  return visibleStati.has(stato);
}

/**
 * Stati sicuri per filtri Supabase `.in()` — esclude slot custom_* se non garantiti dal DB.
 * Usare solo per query esplicite; preferire filtro client-side senza `stati_in`.
 */
export function buildQuerySafeStatiIn(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): StatoLavorazione[] {
  const configured = statiLavorazioniInCorsoOptions(buildStatiLavorazioniOptions(settingsStati));
  const ids = configured
    .map((s) => migrateStatoConfigId(s.id))
    .filter((id) => isQuerySafeStatoForSupabaseFilter(id)) as StatoLavorazione[];

  const uniq = [...new Set(ids)];
  if (!uniq.includes(STATO_LAVORAZIONE_COMPLETATA_DB)) {
    uniq.push(STATO_LAVORAZIONE_COMPLETATA_DB);
  }
  if (uniq.length === 0) {
    return ["bozza", "in_coda", "in_officina", "in_attesa_ricambi", STATO_LAVORAZIONE_COMPLETATA_DB];
  }
  return uniq;
}

export function resolveClientPortalStatoLabel(
  statoId: string,
  statiOpts: StatoLavorazioneConfig[],
): string {
  const safeId = resolveStatoToDbEnum(statoId);
  const fromSettings = statiOpts.find((s) => s.id === safeId)?.label;
  if (fromSettings?.trim()) return fromSettings.trim();
  return safeId;
}
