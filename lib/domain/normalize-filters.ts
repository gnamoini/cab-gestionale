import type { NormalizedLavorazioniFilters } from "@/lib/domain/list-where-spec";
import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";

const DEFAULT_PAGE_LIMIT = 100;

/** Canonicalizer — satisfies FilterContract; deterministic key order for RQ. */
export function normalizeLavorazioniFilters(
  filters?: LavorazioneFilters,
): NormalizedLavorazioniFilters {
  const mode =
    filters?.archived === true ? "closed" : filters?.archived === false ? "active" : "all";
  const search = (filters?.search ?? "").trim() || null;
  const stato = filters?.stato ?? null;

  return {
    mode,
    search,
    stato,
    cursorCreatedAt: null,
    cursorId: null,
    limit: DEFAULT_PAGE_LIMIT,
  };
}
