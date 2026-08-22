import type { ListCursor } from "@/lib/domain/list-types";
import type { Page } from "@/lib/domain/list-types";
import { DEFAULT_DRILLDOWN_PAGE_SIZE } from "@/lib/report/drilldown/types";

type OffsetCursor = { offset: number };

function readOffset(cursor: ListCursor | null | undefined): number {
  if (!cursor || typeof cursor !== "object") return 0;
  const off = (cursor as OffsetCursor).offset;
  return typeof off === "number" && off >= 0 ? off : 0;
}

/** ponytail: keyset cursor on in-memory filtered rows — upgrade path: domain RPC cursors */
export function paginateSlice<T>(
  rows: readonly T[],
  cursor: ListCursor | null | undefined,
  pageSize = DEFAULT_DRILLDOWN_PAGE_SIZE,
): Page<T> {
  const offset = readOffset(cursor);
  const slice = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + slice.length;
  const hasNextPage = nextOffset < rows.length;
  return {
    rows: slice,
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? { offset: nextOffset } : null,
      totalEstimate: rows.length,
    },
  };
}
