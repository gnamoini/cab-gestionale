"use client";

import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { readOperatorGlobalSettingsDbEnabledFromRows } from "@/lib/permissions/operator-global-settings";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
} from "@/lib/permissions/operator-global-settings";

/** Fetch client one-shot per guard async (evita N query pilot sparse). */
export async function fetchClientEffectivePermissionsSnapshot(): Promise<EffectivePermissionsSnapshot | null> {
  const start = performance.now();
  trackRuntimeEvent(RuntimeEvents.rbacResolveStart);
  const sb = getBrowserSupabase();
  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth.user?.id) {
    trackRuntimeEvent(RuntimeEvents.rbacResolveFailed, {
      reason: (authErr?.message ?? "no_user").slice(0, 200),
      durationMs: Math.round(performance.now() - start),
    });
    return null;
  }

  const userId = auth.user.id;

  try {
    const [{ data: prof }, { data: permRows }, { data: settingsRow }] = await Promise.all([
    sb.from("profiles").select("ruolo").eq("id", userId).maybeSingle(),
    sb.from("user_permissions").select("*").eq("user_id", userId),
    sb
      .from("app_settings")
      .select("value")
      .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
      .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
      .maybeSingle(),
    ]);

    const ruolo = typeof prof?.ruolo === "string" ? prof.ruolo : null;
    const pilotDbEnabled = readOperatorGlobalSettingsDbEnabledFromRows(
      settingsRow
        ? [{ module: OPERATOR_GLOBAL_SETTINGS_MODULE, key: OPERATOR_GLOBAL_SETTINGS_KEY, value: settingsRow.value }]
        : [],
    );

    const snap = resolveEffectivePermissions({
      userId,
      ruolo,
      permissionRows: (permRows ?? []) as UserPermissionRow[],
      pilotDbEnabled,
    });
    trackRuntimeEvent(RuntimeEvents.rbacResolveSuccess, {
      userId,
      role: snap.role,
      durationMs: Math.round(performance.now() - start),
    });
    return snap;
  } catch (e) {
    trackRuntimeEvent(RuntimeEvents.rbacResolveFailed, {
      reason: e instanceof Error ? e.message.slice(0, 200) : "unknown",
      durationMs: Math.round(performance.now() - start),
    });
    throw e;
  }
}
