import { resolveRole } from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
import { buildModuleAccessMap } from "@/src/lib/auth/effective-module-access";
import { resolvePilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import type {
  EffectivePermissionsInput,
  EffectivePermissionsSnapshot,
} from "@/src/lib/runtime/truth-layer/types";

export function rbacContextFromPilotDb(dbEnabled: boolean): RbacEvaluationContext {
  return { operatorGlobalSettingsDbEnabled: dbEnabled };
}

/** Canonico: ruolo + user_permissions + pilot DB → snapshot unico per guard/hook. */
export function resolveEffectivePermissions(input: EffectivePermissionsInput): EffectivePermissionsSnapshot {
  const pilot = resolvePilotSettingsState(input.pilotDbEnabled);
  const role = resolveRole(input.ruolo);
  const modules = buildModuleAccessMap(input.ruolo, input.permissionRows ?? []);

  return {
    userId: input.userId,
    role,
    pilot,
    rbacContext: rbacContextFromPilotDb(pilot.dbEnabled),
    modules,
  };
}
