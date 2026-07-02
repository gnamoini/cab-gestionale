import {
  canAccessPage,
  pathnameToSection,
  resolveRole,
  type CanAccessPageOptions,
  type RbacUser,
} from "@/lib/auth/rbac";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import type { RbacEvaluationContext } from "@/lib/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import {
  rbacContextFromPilotDb,
  resolveEffectivePermissions,
} from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

/** Input condiviso tra edge proxy e test CI — allinea capability + moduli granulari. */
export type EvaluateGestionaleRouteAccessInput = {
  user: RbacUser;
  userId: string | null | undefined;
  pathname: string;
  permissionRows?: UserPermissionRow[];
  pilotDbEnabled?: boolean;
  clientLavorazioniAllowed?: boolean;
};

/**
 * Valuta accesso route come proxy edge + RbacPageGuard (canAccessRoute + snapshot).
 * Usa `user_permissions` quando `userId` è presente.
 */
export function evaluateGestionaleRouteAccess(input: EvaluateGestionaleRouteAccessInput): boolean {
  const section = pathnameToSection(input.pathname);
  if (!section) return true;

  const pilotDbEnabled = input.pilotDbEnabled ?? false;
  const rbacCtx: RbacEvaluationContext | undefined =
    section === "impostazioni" ? rbacContextFromPilotDb(pilotDbEnabled) : undefined;

  const snapshot =
    input.userId != null
      ? (() => {
          const roleKey = resolveRole(
            typeof input.user === "object" && input.user != null ? input.user.ruolo : input.user,
          );
          return resolveEffectivePermissions({
            userId: input.userId,
            roleKey,
            rolePermissionKeys: rbacSeedPermissionKeysForRole(roleKey),
            permissionRows: input.permissionRows ?? [],
            pilotDbEnabled,
          });
        })()
      : null;

  const opts: CanAccessPageOptions | undefined =
    input.clientLavorazioniAllowed !== undefined
      ? { clientLavorazioniAllowed: input.clientLavorazioniAllowed }
      : undefined;

  return canAccessRoute({
    user: input.user,
    pathname: input.pathname,
    opts,
    ctx: rbacCtx,
    snapshot,
  });
}

/** @deprecated Usare evaluateGestionaleRouteAccess — mantenuto per assert espliciti capability-only. */
export function evaluateGestionaleRouteAccessCapabilityOnly(
  user: RbacUser,
  pathname: string,
  opts?: CanAccessPageOptions,
  ctx?: RbacEvaluationContext,
): boolean {
  return canAccessPage(user, pathname, opts, ctx);
}
