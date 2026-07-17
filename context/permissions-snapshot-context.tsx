"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export type EffectivePermissionsValue = {
  snapshot: EffectivePermissionsSnapshot | null;
  isLoading: boolean;
};

const PermissionsSnapshotContext = createContext<EffectivePermissionsValue | null>(null);

export function PermissionsSnapshotProvider({
  value,
  children,
}: {
  value: EffectivePermissionsValue;
  children: ReactNode;
}) {
  const stable = useMemo(
    () => value,
    [value.snapshot, value.isLoading],
  );
  return (
    <PermissionsSnapshotContext.Provider value={stable}>
      {children}
    </PermissionsSnapshotContext.Provider>
  );
}

export function usePermissionsSnapshotContext(): EffectivePermissionsValue | null {
  return useContext(PermissionsSnapshotContext);
}
