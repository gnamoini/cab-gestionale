"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";
import {
  buildGestionaleRoute,
  hasLastRouteRestoreBeenAttempted,
  loadLastGestionaleRoute,
  markLastRouteRestoreAttempted,
  saveLastGestionaleRoute,
} from "@/lib/navigation/last-route-persistence";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";
import type { RbacNavAccess, RbacSnapshotBound } from "@/src/lib/rbac/rbac-snapshot-access";

function stagingBlocksRoute(route: string): boolean {
  if (!isStagingPublicSlice()) return false;
  const pathOnly = route.split("?")[0] ?? route;
  return isStagingBlockedPathname(pathOnly);
}

export function shouldRestoreLastRoute(input: {
  pathname: string;
  currentRoute: string;
  homePath: string;
  storedRoute: string | null;
  canAccessRoute: (route: string) => boolean;
  restoreAlreadyAttempted: boolean;
}): string | null {
  if (input.restoreAlreadyAttempted) return null;
  if (!input.storedRoute) return null;
  if (!isNavTargetCurrent(input.pathname, input.homePath)) return null;
  if (input.currentRoute === input.storedRoute) return null;
  if (!input.canAccessRoute(input.storedRoute)) return null;
  if (stagingBlocksRoute(input.storedRoute)) return null;
  return input.storedRoute;
}

type UseLastRouteRestoreInput = {
  userId: string | undefined;
  navAccess: RbacNavAccess | null;
  snapshot: RbacSnapshotBound | null | undefined;
  isNavLoading: boolean;
  homePath: string;
};

export function useLastRouteRestore({
  userId,
  navAccess,
  snapshot,
  isNavLoading,
  homePath,
}: UseLastRouteRestoreInput): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);

  const search = searchParams.toString();
  const currentRoute = buildGestionaleRoute(pathname, search ? `?${search}` : "");

  useEffect(() => {
    if (!userId || isNavLoading || !navAccess || !snapshot) return;
    saveLastGestionaleRoute(userId, currentRoute);
  }, [userId, isNavLoading, navAccess, snapshot, currentRoute]);

  useEffect(() => {
    if (restoredRef.current) return;
    if (!userId || isNavLoading || !navAccess || !snapshot) return;

    const target = shouldRestoreLastRoute({
      pathname,
      currentRoute,
      homePath,
      storedRoute: loadLastGestionaleRoute(userId),
      canAccessRoute: (route) => navAccess.canAccessRoute(route),
      restoreAlreadyAttempted: hasLastRouteRestoreBeenAttempted(),
    });

    restoredRef.current = true;
    markLastRouteRestoreAttempted();

    if (!target) return;
    deferredRouterReplace(router, target);
  }, [userId, isNavLoading, navAccess, snapshot, pathname, currentRoute, homePath, router]);
}
