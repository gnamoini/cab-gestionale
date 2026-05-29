import type { PermissionKey, RbacSection } from "@/lib/auth/rbac";
import type { Capability, RbacEvaluationContext } from "@/lib/rbac";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import type { AppRole } from "@/lib/auth/rbac";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import type { PilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";

export type EffectivePermissionsInput = {
  userId: string | null;
  ruolo: string | null | undefined;
  permissionRows: UserPermissionRow[] | undefined;
  pilotDbEnabled: boolean;
};

export type EffectivePermissionsSnapshot = {
  userId: string | null;
  role: AppRole;
  pilot: PilotSettingsState;
  rbacContext: RbacEvaluationContext;
  modules: Record<GestionalePermissionModule, EffectiveModulePermission>;
};

export type { PermissionKey, RbacSection, Capability, GestionalePermissionModule };
