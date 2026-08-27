import "server-only";

import { resolveRole } from "@/lib/auth/rbac";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { fetchOperatorGlobalSettingsDbEnabledServer } from "@/lib/permissions/operator-global-settings-server";
import { mergeRolePageAccessWithSeed } from "@/src/lib/rbac/load-rbac-data";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export async function resolveServerEffectivePermissions(): Promise<EffectivePermissionsSnapshot | null> {
  const session = await getServerSession();
  if (!session.user?.id) return null;

  const pilotDbEnabled = await fetchOperatorGlobalSettingsDbEnabledServer();
  const roleKey = resolveRole(session.user.roleKey ?? session.user.ruolo);

  return resolveEffectivePermissions({
    userId: session.user.id,
    roleKey,
    rolePageAccess: mergeRolePageAccessWithSeed(roleKey, session.rolePageAccess ?? {}),
    userPageOverrideRows: session.userPageOverrides,
    pilotDbEnabled,
    permissionsHydrated: true,
  });
}
