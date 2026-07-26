"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  resolveListSurfaceForViewportWidth,
  type ListSurface,
} from "@/lib/ui/resolve-list-surface";

function readListSurfaceFromViewport(): ListSurface {
  if (typeof window === "undefined") return "table";
  return resolveListSurfaceForViewportWidth(window.innerWidth);
}

function subscribeListSurfaceViewport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onResize = () => onStoreChange();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
    vv?.removeEventListener("resize", onResize);
  };
}

/**
 * Vista lista reattiva al viewport corrente.
 * Il valore server (`serverSurface`) è solo snapshot SSR/hydration; sul client segue il resize.
 */
export function useListSurface(serverSurface: ListSurface): ListSurface {
  const getServerSnapshot = useCallback(() => serverSurface, [serverSurface]);
  return useSyncExternalStore(
    subscribeListSurfaceViewport,
    readListSurfaceFromViewport,
    getServerSnapshot,
  );
}
