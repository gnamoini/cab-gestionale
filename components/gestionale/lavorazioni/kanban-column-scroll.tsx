"use client";

import { columnHasVerticalOverflow } from "@/lib/lavorazioni/kanban-column-overflow";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Corpo colonna Kanban: scroll verticale solo con overflow reale; altrimenti wheel verso il main. */
export function KanbanColumnScroll({
  columnId,
  children,
  className,
}: {
  columnId: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const measureOverflow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = columnHasVerticalOverflow(el);
    setIsOverflowing((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    measureOverflow();
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => measureOverflow());
    ro.observe(el);

    const mo = new MutationObserver(() => measureOverflow());
    mo.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [columnId, measureOverflow]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && isOverflowing) el.scrollTop = scrollTopRef.current;
  });

  return (
    <div
      ref={ref}
      data-kanban-column-scroll={columnId}
      data-overflowing={isOverflowing ? "true" : "false"}
      className={className}
      onScroll={(e) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
      }}
    >
      {children}
    </div>
  );
}
