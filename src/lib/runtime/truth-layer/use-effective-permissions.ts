"use client";

import { useEffect, useMemo } from "react";
import { cabDevWarn } from "@/src/lib/observability/dev-warn";
import { useAuth } from "@/context/auth-context";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { useUserPermissionsQuery } from "@/src/hooks/use-permissions";
import { publishClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

const EMPTY_SNAPSHOT: EffectivePermissionsSnapshot | null = null;

/** Hook canonico permessi runtime (auth + user_permissions + pilot). */
export function useEffectivePermissions(): {
  snapshot: EffectivePermissionsSnapshot | null;
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const operatorPilot = useOperatorGlobalSettings();
  const permsQuery = useUserPermissionsQuery();

  const isLoading =
    status === "loading" ||
    (Boolean(user?.id) && permsQuery.isLoading && permsQuery.fetchStatus !== "idle" && !permsQuery.data);

  const snapshot = useMemo(() => {
    if (!user?.id) return EMPTY_SNAPSHOT;
    const snap = resolveEffectivePermissions({
      userId: user.id,
      ruolo: user.ruolo,
      permissionRows: permsQuery.data,
      pilotDbEnabled: operatorPilot.dbEnabled,
    });
    publishClientEffectivePermissionsSnapshot(snap);
    return snap;
  }, [user?.id, user?.ruolo, permsQuery.data, operatorPilot.dbEnabled]);

  useEffect(() => {
    /* snapshot già pubblicato in useMemo; effect mantenuto per compat hot reload */
    if (snapshot) publishClientEffectivePermissionsSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!permsQuery.isError || !permsQuery.dataUpdatedAt) return;
    const ageMs = Date.now() - permsQuery.dataUpdatedAt;
    if (ageMs < 5 * 60_000) return;
    cabDevWarn(
      "rbac.stale_snapshot",
      "Permessi utente in errore con cache stale oltre 5 minuti",
      { ageMs, userId: user?.id },
      { oncePerSession: true },
    );
  }, [permsQuery.isError, permsQuery.dataUpdatedAt, user?.id]);

  return { snapshot, isLoading };
}
