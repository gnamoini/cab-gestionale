"use client";

import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { readOperatorGlobalSettingsDbEnabledFromRows } from "@/lib/permissions/operator-global-settings";
import { readClientEffectivePermissionsSnapshotCache, readAuthRoleHint } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { fetchRbacRoleKeyForUser } from "@/lib/rbac/fetch-rbac-role-key";
import { loadRolePageAccess, loadUserPageOverrides } from "@/src/lib/rbac/load-rbac-data";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
} from "@/lib/permissions/operator-global-settings";

function resolveAuthUserId(
  authUser: { id: string } | null | undefined,
  sessionUser: { id: string } | null | undefined,
): string | null {
  return authUser?.id ?? sessionUser?.id ?? null;
}

export async function fetchClientEffectivePermissionsSnapshot(): Promise<EffectivePermissionsSnapshot | null> {
  const cached = readClientEffectivePermissionsSnapshotCache();
  if (cached && cached.role !== "guest" && cached.permissionsHydrated) return cached;

  const start = performance.now();
  trackRuntimeEvent(RuntimeEvents.rbacResolveStart);
  const sb = getBrowserSupabase();
  const { data: auth, error: authErr } = await sb.auth.getUser();
  let sessionUser = auth.user;
  if (authErr || !sessionUser?.id) {
    const { data: sessionWrap } = await sb.auth.getSession();
    sessionUser = sessionWrap.session?.user ?? null;
  }

  const userId = resolveAuthUserId(auth.user, sessionUser);
  if (!userId) {
    trackRuntimeEvent(RuntimeEvents.rbacResolveFailed, {
      reason: (authErr?.message ?? "no_user").slice(0, 200),
      durationMs: Math.round(performance.now() - start),
    });
    return null;
  }

  try {
    const [{ data: settingsRow }, roleKeyFromDb] = await Promise.all([
      sb
        .from("app_settings")
        .select("value")
        .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
        .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
        .maybeSingle(),
      fetchRbacRoleKeyForUser(sb, userId),
    ]);

    let roleKey = roleKeyFromDb !== "guest" ? roleKeyFromDb : null;
    const cachedAfterFetch = readClientEffectivePermissionsSnapshotCache();
    if (!roleKey && cachedAfterFetch?.userId === userId && cachedAfterFetch.role !== "guest") {
      roleKey = cachedAfterFetch.roleKey;
    }
    if (!roleKey) {
      const hint = readAuthRoleHint();
      if (hint?.userId === userId) roleKey = hint.ruolo;
    }
    if (!roleKey) roleKey = "guest";

    const [rolePageAccess, userPageOverridesMap] = await Promise.all([
      loadRolePageAccess(sb, roleKey),
      loadUserPageOverrides(sb, userId),
    ]);

    const pilotDbEnabled = readOperatorGlobalSettingsDbEnabledFromRows(
      settingsRow
        ? [{ module: OPERATOR_GLOBAL_SETTINGS_MODULE, key: OPERATOR_GLOBAL_SETTINGS_KEY, value: settingsRow.value }]
        : [],
    );

    const snap = resolveEffectivePermissions({
      userId,
      roleKey,
      rolePageAccess,
      userPageOverrideRows: Object.entries(userPageOverridesMap).map(([page_key, access_level]) => ({
        page_key,
        access_level,
      })),
      pilotDbEnabled,
      permissionsHydrated: true,
    });
    trackRuntimeEvent(RuntimeEvents.rbacResolveSuccess, {
      userId,
      role: snap.role,
      durationMs: Math.round(performance.now() - start),
    });
    return snap;
  } catch (e) {
    const cachedOnError = readClientEffectivePermissionsSnapshotCache();
    if (cachedOnError?.userId === userId && cachedOnError.permissionsHydrated) {
      trackRuntimeEvent(RuntimeEvents.rbacResolveSuccess, {
        userId,
        role: cachedOnError.role,
        durationMs: Math.round(performance.now() - start),
      });
      return cachedOnError;
    }
    trackRuntimeEvent(RuntimeEvents.rbacResolveFailed, {
      reason: e instanceof Error ? e.message.slice(0, 200) : "unknown",
      durationMs: Math.round(performance.now() - start),
    });
    throw e;
  }
}
