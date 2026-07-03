import type { NormalizedLavorazioniFilters } from "@/lib/domain/list-where-spec";
import { QK } from "@/src/lib/react-query/query-keys";

/** RQ cache util — not domain layer (R-3b). */
export function buildLavorazioniListKey(
  norm: NormalizedLavorazioniFilters,
  clientPortal = false,
) {
  return [...QK.lavorazioniQueries, "list-v2", norm, clientPortal ? "portal" : "ops"] as const;
}
