"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  acquireBodyScrollLock,
  acquireMainScrollLock,
  forceReleaseAllBodyScrollLocks,
  healBodyScrollLockState,
  refreshBodyScrollLockOnViewportChange,
} from "@/lib/ui/body-scroll-lock-manager";

export { BODY_LOCK_ATTR } from "@/lib/ui/body-scroll-lock-manager";

/**
 * Blocca scroll del main gestionale senza paddingRight sul body.
 * Usare per drawer nav mobile quando non serve il body lock.
 */
export function useGestionaleMainScrollLock(active: boolean, source?: string): void {
  useLayoutEffect(() => {
    if (!active) return;
    return acquireMainScrollLock(source ?? "main");
  }, [active, source]);
}

/**
 * Blocca lo scroll documento quando overlay/modal/drawer sono aperti.
 * In app shell blocca anche main.gestionale-scroll-y (scroll interno) senza padding body.
 */
export function useBodyScrollLock(active: boolean, source?: string): void {
  useLayoutEffect(() => {
    if (!active) return;
    return acquireBodyScrollLock(source ?? "useBodyScrollLock");
  }, [active, source]);
}

/** Sblocca scroll su ogni cambio route (modale smontata senza cleanup). */
export function useBodyScrollLockRouteGuard(): void {
  const pathname = usePathname();
  useLayoutEffect(() => {
    forceReleaseAllBodyScrollLocks("route-change");
    healBodyScrollLockState("route-change");
  }, [pathname]);
}

/** Montare una volta in AppProviders. */
export function BodyScrollLockRouteGuard(): null {
  useBodyScrollLockRouteGuard();
  return null;
}

/** Cura lock fantasma al mount, visibility, resize e bfcache iOS. */
export function BodyScrollLockHealGuard(): null {
  useLayoutEffect(() => {
    healBodyScrollLockState("mount");
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onViewportChange = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => refreshBodyScrollLockOnViewportChange("resize"), 100);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        healBodyScrollLockState("visibility");
      }
    };
    const onPageShow = () => healBodyScrollLockState("pageshow");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
  }, []);
  return null;
}
