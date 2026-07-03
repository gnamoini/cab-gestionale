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

export function toLavorazioniPageFromRpc(
  raw: LavorazioniRpcListPageRaw,
  ctx: { includeMezzo: boolean; limit: number },
): Page<LavorazioneListRow> {
  const rows = raw.rows.map((row) =>
    mapLavorazioneLightToListRow(row as LavorazioneRow, { includeMezzo: ctx.includeMezzo }),
  );
  const hasNextPage = raw.next_cursor != null;
  return Object.freeze({
    rows: Object.freeze(rows),
    pageInfo: Object.freeze({
      hasNextPage,
      nextCursor: raw.next_cursor ? Object.freeze({ ...raw.next_cursor }) : null,
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
