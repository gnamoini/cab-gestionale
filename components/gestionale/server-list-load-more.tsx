"use client";

import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { ListQueryResult } from "@/lib/domain/list-types";

type ServerListLoadMoreProps<T> = Pick<
  ListQueryResult<T>,
  "hasNextPage" | "isFetchingNextPage" | "controls"
> & {
  className?: string;
};

/** PR-3 — server pagination load-more (uses top-level hasNextPage, not meta). */
export function ServerListLoadMore<T>({
  hasNextPage,
  isFetchingNextPage,
  controls,
  className,
}: ServerListLoadMoreProps<T>) {
  if (!hasNextPage) return null;
  return (
    <div className={className ?? "flex justify-center py-3"}>
      <button
        type="button"
        className={erpBtnNeutral}
        disabled={isFetchingNextPage}
        onClick={() => controls.fetchNextPage()}
      >
        {isFetchingNextPage ? "Caricamento…" : "Carica altre"}
      </button>
    </div>
  );
}
