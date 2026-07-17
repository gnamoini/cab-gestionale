"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  KANBAN_CARD_ESTIMATE_PX,
  sliceKanbanColumnWindow,
} from "@/lib/lavorazioni/kanban-column-virtual-window";

const VIRTUALIZE_MIN_ITEMS = 24;

type KanbanVirtualColumnScrollProps = {
  columnId: string;
  items: readonly unknown[];
  className?: string;
  children: (visibleItems: readonly unknown[], keyPrefix: string) => ReactNode;
};

/** Kanban column scroll + presentation virtual window — event-driven metrics. */
export function KanbanVirtualColumnScroll({
  columnId,
  items,
  className,
  children,
}: KanbanVirtualColumnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const syncMetrics = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight || 480);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    syncMetrics();
    el.addEventListener("scroll", syncMetrics, { passive: true });
    const ro = new ResizeObserver(syncMetrics);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncMetrics);
      ro.disconnect();
    };
  }, [syncMetrics]);

  const virtualize = items.length >= VIRTUALIZE_MIN_ITEMS;
  const windowSlice = virtualize
    ? sliceKanbanColumnWindow(items, scrollTop, viewportHeight, KANBAN_CARD_ESTIMATE_PX)
    : { start: 0, end: items.length, topSpacerPx: 0, bottomSpacerPx: 0 };
  const visible = virtualize ? items.slice(windowSlice.start, windowSlice.end) : items;

  return (
    <div
      ref={ref}
      data-kanban-column-scroll={columnId}
      className={className}
    >
      {virtualize ? <div style={{ height: windowSlice.topSpacerPx }} aria-hidden /> : null}
      {children(visible, `${columnId}-${windowSlice.start}`)}
      {virtualize ? <div style={{ height: windowSlice.bottomSpacerPx }} aria-hidden /> : null}
    </div>
  );
}
