"use client";

import { useLayoutEffect, useState } from "react";

export const KANBAN_DESKTOP_MQ = "(min-width: 1024px)";

export type KanbanViewportLayout = "desktop" | "mobile";

/** SSR → undefined. Client → matchMedia (viewport-only, no container). */
export function resolveKanbanViewportLayout(): KanbanViewportLayout | undefined {
  if (typeof window === "undefined") return undefined;
  return window.matchMedia(KANBAN_DESKTOP_MQ).matches ? "desktop" : "mobile";
}

/** Kanban layout: viewport-only via matchMedia. Hydration-safe (undefined until useLayoutEffect). */
export function useKanbanViewportLayout(): KanbanViewportLayout | undefined {
  const [layout, setLayout] = useState<KanbanViewportLayout | undefined>(undefined);

  useLayoutEffect(() => {
    const mq = window.matchMedia(KANBAN_DESKTOP_MQ);
    const sync = () => setLayout(mq.matches ? "desktop" : "mobile");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return layout;
}
