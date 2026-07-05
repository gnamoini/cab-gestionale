"use client";

import { useCallback, useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isRbacSnapshotReady, snapshotHasPageRead } from "@/src/lib/rbac/rbac-snapshot-access";

export function useClientLavorazioniAccess() {
  const { user, status } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const sessionReady = isAuthSessionEstablished(status);

  const roleGrantsPortal = useMemo(() => {
    if (!isRbacSnapshotReady(snapshot)) return false;
    return snapshotHasPageRead(snapshot, "lavorazioni_clienti");
  }, [snapshot]);

  const allowed = sessionReady && !!user?.id && roleGrantsPortal;

  const refetch = useCallback(async () => undefined, []);

  return {
    allowed,
    isLoading: !sessionReady || permsLoading,
    isError: false,
    error: null as Error | null,
    refetch,
  };
}
