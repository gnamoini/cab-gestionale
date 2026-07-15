import { pathnameToPage, resolveRole } from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

export type EvaluateGestionaleRouteAccessInput = {
  user: { ruolo?: string | null; roleKey?: string | null; id?: string | null } | string | null | undefined;
  userId: string | null | undefined;
  pathname: string;
  rolePageAccess?: Record<string, PageAccessLevel>;
  userPageOverrideRows?: { page_key: string; access_level: string }[];
  pilotDbEnabled?: boolean;
};

export function evaluateGestionaleRouteAccess(input: EvaluateGestionaleRouteAccessInput): boolean {
  const page = pathnameToPage(input.pathname);
  if (!page) return true;

  const pilotDbEnabled = input.pilotDbEnabled ?? false;

  const snapshot =
    input.userId != null
      ? resolveEffectivePermissions({
          userId: input.userId,
          roleKey: resolveRole(input.user),
          rolePageAccess: input.rolePageAccess ?? {},
          userPageOverrideRows: input.userPageOverrideRows ?? [],
          pilotDbEnabled,
          permissionsHydrated: true,
        })
      : null;

  return canAccessRoute({
    pathname: input.pathname,
    snapshot,
  });
}
