"use client";

import { useMemo } from "react";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import {
  createRbacNavAccess,
  isRbacSnapshotReady,
  type RbacNavAccess,
  type RbacSnapshotBound,
} from "@/src/lib/rbac/rbac-snapshot-access";
import { readStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";

export type UseRbacNavAccessResult = {
  navAccess: RbacNavAccess | null;
  snapshot: RbacSnapshotBound | null;
  isNavReady: boolean;
  isNavLoading: boolean;
};

export function useRbacNavAccess(): UseRbacNavAccessResult {
  const { snapshot, isLoading } = useEffectivePermissions();

  const sticky = readStickyRbacSnapshot();
  const effectiveSnap = isRbacSnapshotReady(snapshot)
    ? snapshot
    : isRbacSnapshotReady(sticky)
      ? sticky
      : null;

  const navAccess = useMemo(() => {
    if (!effectiveSnap) return null;
    return createRbacNavAccess(effectiveSnap);
  }, [effectiveSnap]);

  return {
    navAccess,
    snapshot: effectiveSnap,
    isNavReady: isRbacSnapshotReady(snapshot),
    isNavLoading: isLoading && !effectiveSnap,
  };
}
