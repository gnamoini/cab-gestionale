import {
  lavRowMatchesAdvancedFilters,
  type LavorazioniListFilterVariant,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { lavHaystackForRow } from "@/lib/lavorazioni/lavorazioni-search-haystack-index";
import type { LavPageFilters } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import { matchSearchStringWithPrepared } from "@/lib/search/match";
import type { PreparedSearchQuery } from "@/lib/search/rank";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { buildLavorazioniHaystackIndex, lavHaystackForRow } from "@/lib/lavorazioni/lavorazioni-search-haystack-index";

export function lavRowMatchesPageFiltersIndexed(
  row: LavorazioneListRow,
  filters: LavPageFilters,
  haystackById: Map<string, string>,
  schedeStore: LavorazioneSchedeStore | undefined,
  variant: LavorazioniListFilterVariant,
  addettiRecords: readonly AddettoRecord[] | undefined,
  options?: {
    skipSearchFilter?: boolean;
    preparedSearch?: PreparedSearchQuery | null;
  },
): boolean {
  if (!options?.skipSearchFilter && filters.search.trim()) {
    const prepared = options?.preparedSearch;
    if (!prepared) return true;
    const hay = lavHaystackForRow(row, haystackById, schedeStore);
    if (!matchSearchStringWithPrepared(prepared, hay).matches) return false;
  }
  const { ...advanced } = filters;
  return lavRowMatchesAdvancedFilters(row, advanced, schedeStore, variant, undefined, addettiRecords);
}
