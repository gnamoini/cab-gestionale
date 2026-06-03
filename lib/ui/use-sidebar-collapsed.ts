"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SIDEBAR_COLLAPSED_KEY = "cab-sidebar-collapsed";

const listeners = new Set<() => void>();

function emitSidebarCollapsedChange() {
  for (const listener of listeners) listener();
}

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** SSR e primo paint hydration: sidebar espansa; dopo hydrate legge localStorage senza mismatch. */
export function useSidebarCollapsed(): { collapsed: boolean; toggleCollapsed: () => void } {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false,
  );

  const toggleCollapsed = useCallback(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {
      /* ignore */
    }
    emitSidebarCollapsedChange();
  }, [collapsed]);

  return { collapsed, toggleCollapsed };
}
