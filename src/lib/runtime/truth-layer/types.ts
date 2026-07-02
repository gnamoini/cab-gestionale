import type { Capability } from "@/lib/rbac";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import type { ResolvedPermissions } from "@/src/lib/rbac/resolve-user-permissions";
import type { AppRole } from "@/lib/auth/rbac";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import type { PilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import type { RbacEvaluationContext } from "@/lib/rbac";

export type EffectivePermissionsInput = {
  userId: string | null;
  roleKey: string | null | undefined;
  /** @deprecated use roleKey */
  ruolo?: string | null | undefined;
  rolePermissionKeys: string[];
  permissionRows: UserPermissionRow[] | undefined;
  pilotDbEnabled: boolean;
};

export type EffectivePermissionsSnapshot = {
  userId: string | null;
  role: AppRole;
  roleKey: string;
  pilot: PilotSettingsState;
  rbacContext: RbacEvaluationContext;
  modules: Record<GestionalePermissionModule, EffectiveModulePermission>;
  resolved: ResolvedPermissions;
  rolePermissionKeys: string[];
};
