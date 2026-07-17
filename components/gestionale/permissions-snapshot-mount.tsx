"use client";

import { PermissionsSnapshotProvider } from "@/context/permissions-snapshot-context";
import { useEffectivePermissionsSource } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

/** Singola subscription permessi runtime sotto `(gestionale)/`. */
export function PermissionsSnapshotMount({ children }: { children: React.ReactNode }) {
  const value = useEffectivePermissionsSource();
  return <PermissionsSnapshotProvider value={value}>{children}</PermissionsSnapshotProvider>;
}
