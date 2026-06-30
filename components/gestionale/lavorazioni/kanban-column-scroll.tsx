"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Corpo colonna Kanban — scroll verticale sempre attivo dentro la colonna. */
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

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = scrollTopRef.current;
  });

  return (
    <div
      ref={ref}
      data-kanban-column-scroll={columnId}
      className={className}
      onScroll={(e) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
      }}
    >
      {children}
    </div>
  );
}
