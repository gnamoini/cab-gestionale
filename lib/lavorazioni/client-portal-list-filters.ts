import {
  clientPortalRowMatchesSearch,
  type ClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  FILTER_ALL,
  lavRowMatchesAdvancedFilters,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  lavorazioniAdvancedFiltersActive,
  type LavorazioniAdvancedFilters,
  type LavorazioniListFilterVariant,
  type LavorazioniSectionFilter,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { migrateStatoConfigId } from "@/lib/lavorazioni/stati-dynamic";
import { lavRowMatchesGlobalSearch } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type ClientPortalSectionFilter = LavorazioniSectionFilter;

export type ClientPortalListFilters = LavorazioniAdvancedFilters & {
  search: string;
};

export const CLIENT_PORTAL_FILTERS_EMPTY: ClientPortalListFilters = {
  ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  search: "",
};

const STORAGE_KEY = "gestionale-client-lavorazioni-filters-v4";
const LEGACY_STORAGE_KEYS = [
  "gestionale-client-lavorazioni-filters-v3",
  "gestionale-client-lavorazioni-filters-v2",
  "gestionale-client-lavorazioni-filters-v1",
] as const;

type PersistedClientPortalFilters = Omit<ClientPortalListFilters, "section" | "completamentoDa" | "completamentoA">;

function toPersisted(f: ClientPortalListFilters): PersistedClientPortalFilters {
  const { section: _s, completamentoDa: _c0, completamentoA: _c1, ...rest } = f;
  return rest;
}

function normalizeListFilterField(value: string | undefined): string {
  const v = value?.trim() ?? "";
  if (!v || v === FILTER_ALL) return FILTER_ALL;
  return v;
}

/** Normalizza filtri persistiti — reset list-filters obsoleti su migrazione v3→v4. */
export function sanitizePersistedPortalFilters(
  raw: Partial<PersistedClientPortalFilters>,
  options?: { resetListFilters?: boolean },
): ClientPortalListFilters {
  const merged: ClientPortalListFilters = {
    ...CLIENT_PORTAL_FILTERS_EMPTY,
    ...raw,
    section: "",
    completamentoDa: "",
    completamentoA: "",
  };

  if (options?.resetListFilters) {
    merged.addetto = FILTER_ALL;
    merged.marca = FILTER_ALL;
    merged.modello = FILTER_ALL;
    merged.stato = FILTER_ALL;
  } else {
    merged.addetto = normalizeListFilterField(merged.addetto);
    merged.marca = normalizeListFilterField(merged.marca);
    merged.modello = normalizeListFilterField(merged.modello);
    merged.stato = normalizeListFilterField(merged.stato);
    if (merged.stato !== FILTER_ALL) {
      merged.stato = migrateStatoConfigId(merged.stato);
    }
  }

  return merged;
}

export function clientPortalFiltersActive(f: ClientPortalListFilters): boolean {
  return f.search.trim() !== "" || lavorazioniAdvancedFiltersActive(f);
}

function readLegacyPersistedRaw(): Partial<PersistedClientPortalFilters> | null {
  if (typeof window === "undefined") return null;
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw) as Partial<PersistedClientPortalFilters>;
    } catch {
      continue;
    }
  }
  return null;
}

export function loadClientPortalFiltersPersisted(): ClientPortalListFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const rawV4 = window.sessionStorage.getItem(STORAGE_KEY);
    if (rawV4) {
      const o = JSON.parse(rawV4) as Partial<PersistedClientPortalFilters>;
      return sanitizePersistedPortalFilters(o);
    }

    const legacy = readLegacyPersistedRaw();
    if (!legacy) return null;

    const migrated = sanitizePersistedPortalFilters(legacy, { resetListFilters: true });
    saveClientPortalFiltersPersisted(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function saveClientPortalFiltersPersisted(f: ClientPortalListFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(f)));
  } catch {
    /* ignore quota */
  }
}

export type ClientPortalRowBundle = { row: LavorazioneListRow; fields: ClientPortalRowFields };

export function clientPortalBundleMatchesFilters(
  bundle: ClientPortalRowBundle,
  f: ClientPortalListFilters,
  schedeStore: LavorazioneSchedeStore,
  defaultAddetto: string,
  variant: LavorazioniListFilterVariant,
  logs?: readonly LogModificaRow[],
): boolean {
  const { row, fields } = bundle;

  if (!lavRowMatchesGlobalSearch(row, f.search, schedeStore)) return false;

  const { search: _s, ...advanced } = f;
  const isoRow = { ...row, data_ingresso: fields.dataIngressoIso || row.data_ingresso };
  if (!lavRowMatchesAdvancedFilters(isoRow, advanced, schedeStore, defaultAddetto, variant, logs)) return false;

  return true;
}

export function filterClientPortalBundles(
  bundles: ClientPortalRowBundle[],
  f: ClientPortalListFilters,
  schedeStore: LavorazioneSchedeStore,
  defaultAddetto: string,
  variant: LavorazioniListFilterVariant,
  logsByLav?: ReadonlyMap<string, readonly LogModificaRow[]>,
): ClientPortalRowBundle[] {
  return bundles.filter((b) =>
    clientPortalBundleMatchesFilters(
      b,
      f,
      schedeStore,
      defaultAddetto,
      variant,
      logsByLav?.get(b.row.id),
    ),
  );
}

export type ClientPortalPipelineDebugPayload = {
  inCorsoRaw: number;
  archivioRaw: number;
  bundlesInCorso: number;
  bundlesArchivio: number;
  filteredInCorso: number;
  filteredArchivio: number;
  filters: ClientPortalListFilters;
  filtersActive: boolean;
  queryKeyInCorso?: readonly unknown[];
};

/** Dev-only: traccia dove le righe vengono scartate nel pipeline portale. */
export function logClientPortalPipelineDebug(payload: ClientPortalPipelineDebugPayload): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[clienti-pipeline]", payload);
}

/** @deprecated Usare lavRowMatchesGlobalSearch nel portale clienti. */
export { clientPortalRowMatchesSearch };
