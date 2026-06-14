"use client";

import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { dsScrollbar } from "@/lib/ui/design-system";
import {
  globalTableBase,
  globalTableEmptyCell,
  globalTableFixed,
  globalTableRow,
  globalTableWrap,
  globalTableTbodyInset,
} from "@/lib/ui/global-table";
import { GlobalTableHead } from "@/components/gestionale/global-table/global-table-header";

export type GlobalTableVirtualRows = {
  rowCount: number;
  renderRow: (index: number) => ReactNode;
  estimateRowHeight?: number;
  overscan?: number;
};

export type GlobalTableProps = {
  /** Celle `<th>` dentro la riga header (wrappa automaticamente `<thead><tr>`). */
  headRow: ReactNode;
  /** Righe `<tr>` del body. */
  children: ReactNode;
  colgroup?: ReactNode;
  /** `table-fixed` + colgroup consigliato per liste dense. */
  fixed?: boolean;
  className?: string;
  wrapClassName?: string;
  /** Es. `hidden md:block` per desktop-only accanto a card mobile. */
  visibilityClass?: string;
  stickyHead?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  colSpan?: number;
  /** Virtualizza il tbody — riduce DOM su liste paginate dense (pilot Magazzino). */
  virtualRows?: GlobalTableVirtualRows;
};

function normalizeColgroup(node: ReactNode): ReactNode {
  if (node == null) return null;
  if (isValidElement(node) && node.type === "colgroup") return node;
  return <colgroup>{node}</colgroup>;
}

function VirtualTableBody({
  scrollRef,
  virtualRows,
  colSpan,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualRows: GlobalTableVirtualRows;
  colSpan: number;
}) {
  const [, setMeasureTick] = useState(0);
  const [renderFallback, setRenderFallback] = useState(false);

  const virtualizer = useVirtualizer({
    count: virtualRows.rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => virtualRows.estimateRowHeight ?? 52,
    overscan: virtualRows.overscan ?? 8,
  });

  useLayoutEffect(() => {
    if (virtualRows.rowCount === 0) {
      setRenderFallback(false);
      return;
    }

    setRenderFallback(false);
    let cancelled = false;
    let rafId = 0;
    let ro: ResizeObserver | null = null;
    let attempts = 0;
    const maxAttempts = 24;

    const remeasure = () => {
      if (cancelled) return;
      const before = virtualizer.getVirtualItems().length;
      virtualizer.measure();
      if (virtualizer.getVirtualItems().length !== before) {
        setMeasureTick((tick) => tick + 1);
      }
    };

    const bind = () => {
      if (cancelled || attempts >= maxAttempts) {
        const el = scrollRef.current;
        if (
          !cancelled &&
          virtualizer.getVirtualItems().length === 0 &&
          virtualRows.rowCount > 0 &&
          el &&
          el.clientHeight > 0
        ) {
          setRenderFallback(true);
        }
        return;
      }
      attempts += 1;
      const el = scrollRef.current;
      if (!el) {
        rafId = requestAnimationFrame(bind);
        return;
      }
      if (!ro) {
        ro = new ResizeObserver(remeasure);
        ro.observe(el);
      }
      remeasure();
      if (virtualizer.getVirtualItems().length === 0 && el.clientHeight > 0) {
        rafId = requestAnimationFrame(bind);
      }
    };

    bind();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [scrollRef, virtualRows.rowCount, virtualizer]);

  const items = virtualizer.getVirtualItems();

  if (renderFallback && virtualRows.rowCount > 0) {
    return (
      <tbody className={globalTableTbodyInset}>
        {Array.from({ length: virtualRows.rowCount }, (_, index) => virtualRows.renderRow(index))}
      </tbody>
    );
  }

  const paddingTop = items.length > 0 ? items[0]!.start : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;

  return (
    <tbody className={globalTableTbodyInset}>
      {paddingTop > 0 ? (
        <tr className={globalTableRow} aria-hidden>
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
        </tr>
      ) : null}
      {items.map((item) => virtualRows.renderRow(item.index))}
      {paddingBottom > 0 ? (
        <tr className={globalTableRow} aria-hidden>
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
        </tr>
      ) : null}
    </tbody>
  );
}

/**
 * Shell tabella gestionale — design globale (header Preventivi).
 * Logica sorting/filtri/paginazione resta nelle pagine; qui solo layout/UI.
 */
export function GlobalTable({
  headRow,
  children,
  colgroup,
  fixed = true,
  className = "",
  wrapClassName = "",
  visibilityClass = "",
  stickyHead = false,
  empty,
  emptyMessage = "Nessun risultato.",
  colSpan = 1,
  virtualRows,
}: GlobalTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableClass = `${fixed ? globalTableFixed : globalTableBase} ${className}`.trim();
  const useVirtual = Boolean(virtualRows && !empty && virtualRows.rowCount > 0);

  return (
    <div
      ref={scrollRef}
      className={`${globalTableWrap} ${dsScrollbar} ${visibilityClass} ${wrapClassName}`.trim()}
    >
      <table className={tableClass}>
        {normalizeColgroup(colgroup)}
        <GlobalTableHead sticky={stickyHead}>{headRow}</GlobalTableHead>
        {useVirtual && virtualRows ? (
          <VirtualTableBody scrollRef={scrollRef} virtualRows={virtualRows} colSpan={colSpan} />
        ) : (
          <tbody className={globalTableTbodyInset}>
            {empty ? (
              <tr className={globalTableRow}>
                <td colSpan={colSpan} className={globalTableEmptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        )}
      </table>
    </div>
  );
}
