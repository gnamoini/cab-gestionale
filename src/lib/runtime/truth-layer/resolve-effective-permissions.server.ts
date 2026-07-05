import "server-only";

import { getServerSession } from "@/src/lib/auth/get-server-session";
import { fetchOperatorGlobalSettingsDbEnabledServer } from "@/lib/permissions/operator-global-settings-server";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export async function resolveServerEffectivePermissions(): Promise<EffectivePermissionsSnapshot | null> {
  const session = await getServerSession();
  if (!session.user?.id) return null;

  const pilotDbEnabled = await fetchOperatorGlobalSettingsDbEnabledServer();

  return resolveEffectivePermissions({
    userId: session.user.id,
    roleKey: session.user.roleKey ?? session.user.ruolo,
    rolePageAccess: session.rolePageAccess,
    userPageOverrideRows: session.userPageOverrides,
    pilotDbEnabled,
  });
}
