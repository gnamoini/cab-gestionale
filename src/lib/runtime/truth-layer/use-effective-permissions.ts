"use client";

import { useEffect, useMemo, useRef } from "react";
import { cabDevWarn } from "@/src/lib/observability/dev-warn";
import { useAuth } from "@/context/auth-context";
import { usePermissionsSnapshotContext } from "@/context/permissions-snapshot-context";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { useUserPageOverridesQuery, useRolePageAccessQuery } from "@/src/hooks/use-permissions";
import { publishClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { resolveRole } from "@/lib/auth/rbac";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { publishStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";

const EMPTY_SNAPSHOT: EffectivePermissionsSnapshot | null = null;

function permissionsQueriesSettled(
  roleAccessQuery: ReturnType<typeof useRolePageAccessQuery>,
  overridesQuery: ReturnType<typeof useUserPageOverridesQuery>,
): boolean {
  return roleAccessQuery.isFetched && overridesQuery.isFetched;
}

/** Fonte unica query permessi — montata da `PermissionsSnapshotMount` sotto gestionale. */
export function useEffectivePermissionsSource(): {
  snapshot: EffectivePermissionsSnapshot | null;
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const operatorPilot = useOperatorGlobalSettings();
  const overridesQuery = useUserPageOverridesQuery();
  const roleAccessQuery = useRolePageAccessQuery();
  const lastGoodRef = useRef<EffectivePermissionsSnapshot | null>(null);

  const permissionsHydrated =
    Boolean(user?.id) &&
    roleAccessQuery.isSuccess &&
    overridesQuery.isSuccess &&
    permissionsQueriesSettled(roleAccessQuery, overridesQuery);

  const isLoading = status === "loading" || (Boolean(user?.id) && !permissionsHydrated);

  const snapshot = useMemo(() => {
    if (!user?.id) return EMPTY_SNAPSHOT;

    const roleBundle = roleAccessQuery.data;
    const snap = resolveEffectivePermissions({
      userId: user.id,
      roleKey: roleBundle?.roleKey ?? user.roleKey ?? user.ruolo,
      rolePageAccess: roleBundle?.rolePageAccess ?? {},
      userPageOverrideRows: overridesQuery.data,
      pilotDbEnabled: operatorPilot.dbEnabled,
      permissionsHydrated,
    });

    if (snap.permissionsHydrated) {
      publishClientEffectivePermissionsSnapshot(snap);
      publishStickyRbacSnapshot(snap);
      lastGoodRef.current = snap;
    } else if (resolveRole(snap.roleKey ?? snap.role) === "admin") {
      publishStickyRbacSnapshot(snap);
      lastGoodRef.current = snap;
    }
    return snap;
  }, [
    user?.id,
    user?.roleKey,
    user?.ruolo,
    roleAccessQuery.data,
    overridesQuery.data,
    operatorPilot.dbEnabled,
    permissionsHydrated,
  ]);

  const displaySnapshot =
    snapshot && isRbacSnapshotReady(snapshot) ? snapshot : lastGoodRef.current;

  useEffect(() => {
    if (displaySnapshot && isRbacSnapshotReady(displaySnapshot)) {
      publishClientEffectivePermissionsSnapshot(displaySnapshot);
    }
  }, [displaySnapshot]);

  useEffect(() => {
    if (!overridesQuery.isError || !overridesQuery.dataUpdatedAt) return;
    const ageMs = Date.now() - overridesQuery.dataUpdatedAt;
    if (ageMs < 5 * 60_000) return;
    cabDevWarn(
      "rbac.stale_snapshot",
      "Permessi utente in errore con cache stale oltre 5 minuti",
      { ageMs, userId: user?.id },
      { oncePerSession: true },
    );
  }, [overridesQuery.isError, overridesQuery.dataUpdatedAt, user?.id]);

  return { snapshot: displaySnapshot, isLoading };
}

/** Hook canonico permessi runtime — legge snapshot dal provider gestionale. */
export function useEffectivePermissions(): {
  snapshot: EffectivePermissionsSnapshot | null;
  isLoading: boolean;
} {
  const ctx = usePermissionsSnapshotContext();
  return ctx ?? { snapshot: null, isLoading: true };
}
