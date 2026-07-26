"use client";

import { useEffect } from "react";
import {
  GESTIONALE_LIST_SURFACE_COOKIE,
  resolveListSurfaceForViewportWidth,
} from "@/lib/ui/resolve-list-surface";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function writeListSurfaceCookie(surface: ReturnType<typeof resolveListSurfaceForViewportWidth>): void {
  document.cookie = `${GESTIONALE_LIST_SURFACE_COOKIE}=${surface};path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax`;
}

/** Mantiene il cookie listSurface allineato al viewport (navigazione SSR + resize). */
export function ListSurfaceCookieSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => writeListSurfaceCookie(resolveListSurfaceForViewportWidth(window.innerWidth));

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      vv?.removeEventListener("resize", sync);
    };
  }, []);

  return null;
}
