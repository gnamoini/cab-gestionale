import {
  resolveRole,
  type RbacEvaluationContext,
  type RequiredRbacContext,
} from "@/lib/auth/rbac";
import { mergeRolePageAccessWithSeed } from "@/src/lib/rbac/load-rbac-data";
import { resolvePilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import { resolvePageAccess, type ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type {
  EffectivePermissionsInput,
  EffectivePermissionsSnapshot,
} from "@/src/lib/runtime/truth-layer/types";

export function rbacContextFromPilotDb(
  dbEnabled: boolean,
  resolved?: import("@/src/lib/rbac/resolve-page-access").ResolvedPageAccess,
): RbacEvaluationContext {
  return { operatorGlobalSettingsDbEnabled: dbEnabled, resolved };
}

function userOverridesFromRows(
  rows: { page_key: string; access_level: string }[] | undefined,
): Record<string, PageAccessLevel> {
  const out: Record<string, PageAccessLevel> = {};
  for (const row of rows ?? []) {
    const level = row.access_level;
    if (level === "write" || level === "read" || level === "none") {
      out[row.page_key] = level;
    }
  }
  return out;
}

/** Canonico: ruolo + role_page_access + user_page_overrides + pilot DB → snapshot unico. */
export function resolveEffectivePermissions(input: EffectivePermissionsInput): EffectivePermissionsSnapshot {
  const pilot = resolvePilotSettingsState(input.pilotDbEnabled);
  const roleKey = resolveRole(input.roleKey ?? input.ruolo);
  const userId = input.userId ?? "";
  const userPageOverrides = userOverridesFromRows(input.userPageOverrideRows);
  // ponytail: seed = default ruoli canonici; DB (role_page_access) sovrascrive per pagina
  const rolePageAccess = mergeRolePageAccessWithSeed(roleKey, input.rolePageAccess);
  const resolved = resolvePageAccess({
    userId,
    roleKey,
    rolePageAccess,
    userPageOverrides,
  });

  return {
    userId: input.userId,
    role: roleKey,
    roleKey,
    pilot,
    rbacContext: rbacContextFromPilotDb(pilot.dbEnabled, resolved) as RequiredRbacContext & {
      resolved: ResolvedPageAccess;
    },
    resolved,
    rolePageAccess,
    modules: resolved.modules,
  };
}
