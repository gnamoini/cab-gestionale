import type { Page } from "@/lib/domain/list-types";
import type { RpcListParams } from "@/lib/domain/to-query-params";
import { mapLavorazioneLightToListRow } from "@/lib/db/dto-mappers";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

export type LavorazioniRpcListCursor = Readonly<{
  created_at: string;
  id: string;
}>;

export type LavorazioniRpcListPageRaw = Readonly<{
  rows: readonly Record<string, unknown>[];
  next_cursor: LavorazioniRpcListCursor | null;
  total_estimate: number | null;
}>;

export function isValidLavorazioniRpcListCursor(
  cursor: LavorazioniRpcListCursor | Readonly<Record<string, unknown>> | null | undefined,
): boolean {
  if (!cursor || typeof cursor !== "object") return false;
  const c = cursor as { created_at?: unknown; id?: unknown };
  return Boolean(String(c.created_at ?? "").trim() && String(c.id ?? "").trim());
}

export function toLavorazioniPageFromRpc(
  raw: LavorazioniRpcListPageRaw,
  ctx: { includeMezzo: boolean; limit: number },
): Page<LavorazioneListRow> {
  const rows = raw.rows.map((row) =>
    mapLavorazioneLightToListRow(row as LavorazioneRow, { includeMezzo: ctx.includeMezzo }),
  );
  const limit = Math.max(1, ctx.limit);
  const validCursor = isValidLavorazioniRpcListCursor(raw.next_cursor);
  const hasNextPage = rows.length >= limit && validCursor;
  const nextCursor =
    hasNextPage && raw.next_cursor
      ? Object.freeze({
          created_at: String(raw.next_cursor.created_at).trim(),
          id: String(raw.next_cursor.id).trim(),
        })
      : null;
  return Object.freeze({
    rows: Object.freeze(rows),
    pageInfo: Object.freeze({
      hasNextPage,
      nextCursor,
      totalEstimate: raw.total_estimate,
    }),
  });
}

export function rpcCursorFromPageParam(
  pageParam: LavorazioniRpcListCursor | null,
  params: RpcListParams,
): RpcListParams {
  if (!pageParam) return params;
  return {
    ...params,
    cursor_created_at: pageParam.created_at,
    cursor_id: pageParam.id,
  };
}
