"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

/** PR-6 — kanban column scroll + presentation virtual window (U5). */
export function KanbanVirtualColumnScroll({
  columnId,
  items,
  className,
  children,
}: KanbanVirtualColumnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const [scrollTop, setScrollTop] = useState(0);

  const syncMetrics = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    scrollTopRef.current = el.scrollTop;
    setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight || 480);
  }, []);

  useLayoutEffect(() => {
    syncMetrics();
  });

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
      onScroll={() => syncMetrics()}
    >
      {virtualize ? <div style={{ height: windowSlice.topSpacerPx }} aria-hidden /> : null}
      {children(visible, `${columnId}-${windowSlice.start}`)}
      {virtualize ? <div style={{ height: windowSlice.bottomSpacerPx }} aria-hidden /> : null}
    </div>
  );
}
