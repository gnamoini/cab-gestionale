import { useCallback, useMemo, useState } from "react";

/** Default desktop (retrocompatibilità). */
export const CLIENT_PAGE_SIZE = 100;

export type ClientPagination = {
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  pageCount: number;
  sliceItems: <T>(items: T[]) => T[];
  from: number;
  to: number;
  showPager: boolean;
  label: string;
  resetPage: () => void;
};

/** Pagina 1-based che contiene `itemIndex` (0-based) nella lista filtrata. */
export function clientPaginationPageForIndex(itemIndex: number, pageSize: number): number {
  const size = Math.max(1, pageSize);
  if (itemIndex < 0) return 1;
  return Math.floor(itemIndex / size) + 1;
}

export function useClientPagination(total: number, pageSize: number = CLIENT_PAGE_SIZE): ClientPagination {
  const size = Math.max(1, pageSize);
  const pageCount = useMemo(() => Math.max(1, Math.ceil(Math.max(0, total) / size)), [total, size]);
  const [page, setPage] = useState(1);
  const safePage = Math.min(Math.max(1, page), pageCount);

  const showPager = total > size;

  const sliceItems = useCallback(
    <T,>(items: T[]): T[] => {
      if (!showPager) return items;
      const start = (safePage - 1) * size;
      return items.slice(start, start + size);
    },
    [safePage, showPager, size],
  );

  const { from, to, label } = useMemo(() => {
    if (total <= 0) {
      return { from: 0, to: 0, label: "Nessun risultato" };
    }
    if (!showPager) {
      return { from: 1, to: total, label: `Mostrando 1–${total} di ${total} risultati` };
    }
    const startIdx = (safePage - 1) * size;
    const fromN = startIdx + 1;
    const toN = Math.min(safePage * size, total);
    return {
      from: fromN,
      to: toN,
      label: `Mostrando ${fromN}–${toN} di ${total.toLocaleString("it-IT")} risultati`,
    };
  }, [safePage, total, showPager, size]);

  const resetPage = useCallback(() => setPage(1), []);

  return { page: safePage, setPage, pageCount, sliceItems, from, to, showPager, label, resetPage };
}
