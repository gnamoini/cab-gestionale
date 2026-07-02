import {
  pathnameToSection,
  resolveRole,
  type CanAccessPageOptions,
  type RbacUser,
} from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

/** Input condiviso tra edge proxy e test CI — allinea capability + moduli granulari. */
export type EvaluateGestionaleRouteAccessInput = {
  user: RbacUser;
  userId: string | null | undefined;
  pathname: string;
  permissionRows?: UserPermissionRow[];
  rolePermissionKeys?: string[];
  pilotDbEnabled?: boolean;
  clientLavorazioniAllowed?: boolean;
};

/**
 * Valuta accesso route come proxy edge + RbacPageGuard (canAccessRoute + snapshot).
 * Usa `rolePermissionKeys` e `user_permissions` dal DB (mai seed runtime).
 */
export function evaluateGestionaleRouteAccess(input: EvaluateGestionaleRouteAccessInput): boolean {
  const section = pathnameToSection(input.pathname);
  if (!section) return true;

  const pilotDbEnabled = input.pilotDbEnabled ?? false;

  const snapshot =
    input.userId != null
      ? (() => {
          const roleKey = resolveRole(input.user);
          return resolveEffectivePermissions({
            userId: input.userId,
            roleKey,
            rolePermissionKeys: input.rolePermissionKeys ?? [],
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
    snapshot,
  });
}
