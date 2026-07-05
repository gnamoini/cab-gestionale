import { QK } from "@/src/lib/react-query/query-keys";
import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";

/** Chiave stabile lista lavorazioni — condivisa client hooks e server prefetch. */
export function stableLavorazioniFiltersKey(filters: LavorazioneFilters | undefined): string {
  if (filters == null) return "__all__";
  return JSON.stringify({
    m: filters.mezzo_id ?? "",
    s: filters.stato ?? "",
    p: filters.priorita ?? "",
    i: filters.includeMezzo ? 1 : 0,
    fm: filters.fetchMode ?? "light",
    ip: filters.includeProfiles ? 1 : 0,
    si: [...(filters.stati_in ?? [])].sort().join("|"),
    q: (filters.search ?? "").trim(),
    di0: (filters.data_ingresso_da ?? "").trim(),
    di1: (filters.data_ingresso_a ?? "").trim(),
    du0: (filters.data_uscita_da ?? "").trim(),
    du1: (filters.data_uscita_a ?? "").trim(),
    ar: filters.archived === true ? 1 : filters.archived === false ? 0 : -1,
  });
}

export function lavorazioniListQueryKey(
  filtersOrStableKey: LavorazioneFilters | undefined | string,
  clientPortal = false,
) {
  const fk =
    typeof filtersOrStableKey === "string"
      ? filtersOrStableKey
      : stableLavorazioniFiltersKey(filtersOrStableKey);
  return [...QK.lavorazioniQueries, "list", fk, clientPortal ? "portal" : "ops"] as const;
}

export function lavorazioniListCountQueryKey(
  filtersOrStableKey: LavorazioneFilters | undefined | string,
  clientPortal = false,
) {
  return [...lavorazioniListQueryKey(filtersOrStableKey, clientPortal), "count"] as const;
}

export function isLavorazioniListQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === QK.lavorazioniQueries[0] && queryKey[1] === "list";
}
