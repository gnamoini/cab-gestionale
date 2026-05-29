"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  acquireBodyScrollLock,
  forceReleaseAllBodyScrollLocks,
} from "@/lib/ui/body-scroll-lock-manager";

export { BODY_LOCK_ATTR } from "@/lib/ui/body-scroll-lock-manager";

/**
 * Blocca lo scroll documento quando overlay/modal/drawer sono aperti.
 * Delega al body scroll manager globale (reference counting + restore sicuro).
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
  }, [pathname]);
}

/** Montare una volta in AppProviders. */
export function BodyScrollLockRouteGuard(): null {
  useBodyScrollLockRouteGuard();
  return null;
}
