"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";

export const GLOBAL_LISTBOX_VIRTUALIZE_THRESHOLD = 24;

export type GlobalVirtualizedListboxProps = {
  rowCount: number;
  estimateRowHeight?: number;
  overscan?: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scrollToRowRef?: MutableRefObject<((index: number) => void) | null>;
  /** Scroll container è un antenato — non creare wrapper scroll interno né rubare il ref. */
  externalScrollHost?: boolean;
  className?: string;
  style?: CSSProperties;
  role?: string;
  id?: string;
  "aria-label"?: string;
  renderRow: (index: number) => ReactNode;
};

/**
 * Listbox scrollabile con virtualizzazione oltre la soglia standard.
 * Sotto la soglia renderizza tutte le righe senza overhead virtualizer.
 */
export function GlobalVirtualizedListbox({
  rowCount,
  estimateRowHeight = 44,
  overscan = 6,
  scrollRef: scrollRefProp,
  scrollToRowRef,
  externalScrollHost = false,
  className = "",
  style,
  role = "listbox",
  id,
  "aria-label": ariaLabel,
  renderRow,
}: GlobalVirtualizedListboxProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = scrollRefProp ?? internalScrollRef;
  const hostIsExternal = externalScrollHost && scrollRefProp != null;
  const useVirtual = rowCount > GLOBAL_LISTBOX_VIRTUALIZE_THRESHOLD;
  const [externalMeasureReady, setExternalMeasureReady] = useState(!hostIsExternal);

  // eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-virtual estimateSize contract
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
    enabled: useVirtual,
  });

  useLayoutEffect(() => {
    if (!hostIsExternal || !useVirtual) {
      setExternalMeasureReady(true);
      return;
    }

    setExternalMeasureReady(false);
    let cancelled = false;
    let rafId = 0;
    let ro: ResizeObserver | null = null;
    let attempts = 0;
    const maxAttempts = 24;

    const remeasure = () => {
      if (cancelled) return;
      virtualizer.measure();
      if (virtualizer.getVirtualItems().length > 0) {
        setExternalMeasureReady(true);
      }
    };

    const bind = () => {
      if (cancelled || attempts >= maxAttempts) return;
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
  }, [hostIsExternal, useVirtual, virtualizer, scrollRef, rowCount]);

  useEffect(() => {
    if (!scrollToRowRef) return;
    const scrollToRow = (index: number) => {
      if (index < 0 || index >= rowCount) return;
      if (useVirtual) {
        virtualizer.scrollToIndex(index, { align: "center" });
        return;
      }
      const row = scrollRef.current?.querySelector(`[data-listbox-row-index="${index}"]`);
      row?.scrollIntoView({ block: "center" });
    };
    scrollToRowRef.current = scrollToRow;
    return () => {
      scrollToRowRef.current = null;
    };
  }, [scrollToRowRef, rowCount, useVirtual, virtualizer, scrollRef]);

  if (!useVirtual) {
    const rows = Array.from({ length: rowCount }, (_, i) => (
      <div key={i} data-listbox-row-index={i}>
        {renderRow(i)}
      </div>
    ));

    if (hostIsExternal) {
      return <>{rows}</>;
    }

    return (
      <div
        ref={scrollRef}
        id={id}
        role={role}
        aria-label={ariaLabel}
        className={className}
        style={style}
      >
        {rows}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();
  const externalMeasurePending = hostIsExternal && !externalMeasureReady && rowCount > 0;

  if (externalMeasurePending) {
    return (
      <div
        aria-busy="true"
        aria-hidden
        style={{ height: virtualizer.getTotalSize(), pointerEvents: "none" }}
      />
    );
  }

  const paddingTop = items.length > 0 ? items[0]!.start : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;

  const virtualRows = (
    <>
      {paddingTop > 0 ? <div style={{ height: paddingTop }} aria-hidden /> : null}
      {items.map((item) => (
        <div key={item.key} data-index={item.index} data-listbox-row-index={item.index}>
          {renderRow(item.index)}
        </div>
      ))}
      {paddingBottom > 0 ? <div style={{ height: paddingBottom }} aria-hidden /> : null}
    </>
  );

  if (hostIsExternal) {
    return virtualRows;
  }

  return (
    <div
      ref={scrollRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {virtualRows}
    </div>
  );
}
