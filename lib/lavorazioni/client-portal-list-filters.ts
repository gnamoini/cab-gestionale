import {
  clientPortalRowMatchesSearch,
  type ClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  lavRowMatchesAdvancedFilters,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  lavorazioniAdvancedFiltersActive,
  type LavorazioniAdvancedFilters,
  type LavorazioniSectionFilter,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { lavRowIngressoInRange } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type ClientPortalSectionFilter = LavorazioniSectionFilter;

export type ClientPortalListFilters = LavorazioniAdvancedFilters & {
  search: string;
};

export const CLIENT_PORTAL_FILTERS_EMPTY: ClientPortalListFilters = {
  ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  search: "",
};

const STORAGE_KEY = "gestionale-client-lavorazioni-filters-v2";

export function clientPortalFiltersActive(f: ClientPortalListFilters): boolean {
  return f.search.trim() !== "" || lavorazioniAdvancedFiltersActive(f);
}

export function loadClientPortalFiltersPersisted(): ClientPortalListFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = window.sessionStorage.getItem("gestionale-client-lavorazioni-filters-v1");
      if (!legacy) return null;
      const o = JSON.parse(legacy) as Partial<ClientPortalListFilters>;
      return { ...CLIENT_PORTAL_FILTERS_EMPTY, ...o };
    }
    const o = JSON.parse(raw) as Partial<ClientPortalListFilters>;
    return { ...CLIENT_PORTAL_FILTERS_EMPTY, ...o };
  } catch {
    return null;
  }
}

export function saveClientPortalFiltersPersisted(f: ClientPortalListFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f));
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
): boolean {
  const { row, fields } = bundle;

  if (!clientPortalRowMatchesSearch(fields, f.search)) return false;

  const isoRow = { ...row, data_ingresso: fields.dataIngressoIso || row.data_ingresso };
  if (!lavRowIngressoInRange(isoRow, f.ingressoDa, f.ingressoA)) return false;

  const { search: _s, ...advanced } = f;
  if (!lavRowMatchesAdvancedFilters(row, advanced, schedeStore, defaultAddetto)) return false;

  return true;
}

export function filterClientPortalBundles(
  bundles: ClientPortalRowBundle[],
  f: ClientPortalListFilters,
  schedeStore: LavorazioneSchedeStore,
  defaultAddetto: string,
): ClientPortalRowBundle[] {
  return bundles.filter((b) => clientPortalBundleMatchesFilters(b, f, schedeStore, defaultAddetto));
}
