"use client";

import { useEffect, useMemo, useRef } from "react";
import { cabDevWarn } from "@/src/lib/observability/dev-warn";
import { useAuth } from "@/context/auth-context";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { useUserPermissionsQuery, useRolePermissionKeysQuery } from "@/src/hooks/use-permissions";
import { publishClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { publishStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";

const EMPTY_SNAPSHOT: EffectivePermissionsSnapshot | null = null;

/** Hook canonico permessi runtime (auth + user_permissions + pilot). */
export function useEffectivePermissions(): {
  snapshot: EffectivePermissionsSnapshot | null;
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const operatorPilot = useOperatorGlobalSettings();
  const permsQuery = useUserPermissionsQuery();
  const roleKeysQuery = useRolePermissionKeysQuery();
  const lastGoodRef = useRef<EffectivePermissionsSnapshot | null>(null);

  const isLoading =
    status === "loading" ||
    (Boolean(user?.id) &&
      ((permsQuery.isLoading && permsQuery.fetchStatus !== "idle" && !permsQuery.data) ||
        (roleKeysQuery.isLoading && roleKeysQuery.fetchStatus !== "idle" && !roleKeysQuery.data)));

  const snapshot = useMemo(() => {
    if (!user?.id) return EMPTY_SNAPSHOT;
    const snap = resolveEffectivePermissions({
      userId: user.id,
      roleKey: user.roleKey ?? user.ruolo,
      rolePermissionKeys: roleKeysQuery.data ?? [],
      permissionRows: permsQuery.data,
      pilotDbEnabled: operatorPilot.dbEnabled,
    });
    publishClientEffectivePermissionsSnapshot(snap);
    if (isRbacSnapshotReady(snap)) {
      publishStickyRbacSnapshot(snap);
      lastGoodRef.current = snap;
    }
    return snap;
  }, [user?.id, user?.roleKey, user?.ruolo, roleKeysQuery.data, permsQuery.data, operatorPilot.dbEnabled]);

  const displaySnapshot =
    snapshot && isRbacSnapshotReady(snapshot) ? snapshot : lastGoodRef.current;

  useEffect(() => {
    if (displaySnapshot) publishClientEffectivePermissionsSnapshot(displaySnapshot);
  }, [displaySnapshot]);

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

  return { snapshot: displaySnapshot, isLoading };
}
