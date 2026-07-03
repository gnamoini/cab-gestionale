import type { NormalizedLavorazioniFilters } from "@/lib/domain/list-where-spec";

/** RpcListParams — frozen shape in PR-0; PR-1 extends SQL only, not fields. */
export type RpcListParams = Readonly<{
  mode: "active" | "closed" | "all";
  search: string | null;
  stato: string | null;
  limit: number;
  cursor_created_at: string | null;
  cursor_id: string | null;
}>;

/** Unico mapping verso backend — deterministic 1:1, no branching (PR-0). */
export function toQueryParams(norm: NormalizedLavorazioniFilters): RpcListParams {
  return {
    mode: norm.mode,
    search: norm.search,
    stato: norm.stato,
    limit: norm.limit,
    cursor_created_at: norm.cursorCreatedAt,
    cursor_id: norm.cursorId,
  };
}
