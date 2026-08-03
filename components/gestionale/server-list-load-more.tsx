"use client";

import { erpBtnNeutral, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { ListQueryResult } from "@/lib/domain/list-types";

type ServerListLoadMoreProps<T> = Pick<
  ListQueryResult<T>,
  "hasNextPage" | "isFetchingNextPage" | "controls"
> & {
  className?: string;
  /** Righe attualmente mostrate nella lista. */
  loadedCount: number;
  /** Totale risultati (DB o filtrati); null se non disponibile. */
  totalCount?: number | null;
  /** Etichetta unità — es. "lavorazioni". */
  itemLabel?: string;
  /** Soglia page-size server: sotto questo totale non mostrare stato/footer. */
  pageSizeThreshold?: number;
};

function formatIt(n: number): string {
  return n.toLocaleString("it-IT");
}

function shouldShowLoadMoreFooter(
  loaded: number,
  total: number | null,
  hasNextPage: boolean,
  pageSizeThreshold: number,
): boolean {
  if (hasNextPage) return true;
  const threshold = Math.max(1, pageSizeThreshold);
  if (total != null) return total >= threshold;
  return loaded >= threshold;
}

function buildStatusLabel(
  loaded: number,
  total: number | null | undefined,
  itemLabel: string,
): string | null {
  if (loaded <= 0 && total == null) return null;
  if (total != null && total > 0) {
    return `Mostrate ${formatIt(loaded)} di ${formatIt(total)} ${itemLabel}`;
  }
  if (loaded > 0) return `Mostrate ${formatIt(loaded)} ${itemLabel}`;
  return null;
}

/** PR-3 — server pagination load-more con stato caricamento. */
export function ServerListLoadMore<T>({
  hasNextPage,
  isFetchingNextPage,
  controls,
  loadedCount,
  totalCount = null,
  itemLabel = "risultati",
  pageSizeThreshold = 100,
  className,
}: ServerListLoadMoreProps<T>) {
  const loaded = Math.max(0, loadedCount);
  const total = totalCount != null ? Math.max(loaded, totalCount) : null;
  const statusLabel = buildStatusLabel(loaded, total, itemLabel);
  const remaining = total != null ? Math.max(0, total - loaded) : null;

  if (!shouldShowLoadMoreFooter(loaded, total, hasNextPage, pageSizeThreshold)) {
    return null;
  }

  if (!hasNextPage) {
    if (!statusLabel) return null;
    const allLoaded = total != null && loaded >= total;
    return (
      <div
        className={`flex min-w-0 max-w-full flex-col gap-2 border-t border-[color:var(--cab-border)] px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${className ?? ""}`}
      >
        <p className="text-center text-xs leading-snug text-[color:var(--cab-text-muted)] sm:text-left">
          {statusLabel}
          {allLoaded ? " — tutte caricate" : ""}
        </p>
      </div>
    );
  }

  const buttonLabel = isFetchingNextPage
    ? "Caricamento…"
    : remaining != null && remaining > 0
      ? `Carica altre (${formatIt(remaining)} rimanenti)`
      : "Carica altre";

  return (
    <div
      className={`flex min-w-0 max-w-full flex-col gap-2 border-t border-[color:var(--cab-border)] px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${className ?? ""}`}
    >
      {statusLabel ? (
        <p className="text-center text-xs leading-snug text-[color:var(--cab-text-muted)] sm:text-left">
          {statusLabel}
        </p>
      ) : null}
      <div className="flex justify-center sm:justify-end sm:shrink-0">
        <button
          type="button"
          className={`${erpBtnNeutral} ${erpFocus} min-h-9 px-4 text-sm font-semibold`}
          disabled={isFetchingNextPage}
          onClick={() => controls.fetchNextPage()}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
