import { canAccessRoute, type CanAccessRouteInput } from "@/src/lib/auth/can-access-route";
import type { RbacUser } from "@/lib/auth/rbac";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export type RouteProtectionExpectation = {
  pathname: string;
  allowed: boolean;
  opts?: CanAccessRouteInput["opts"];
};

/** Verifica matrice path × utente/snapshot (fail-fast con messaggio). */
export function assertRouteProtection(
  user: RbacUser,
  expectations: RouteProtectionExpectation[],
  snapshot?: EffectivePermissionsSnapshot | null,
): void {
  for (const exp of expectations) {
    const actual = canAccessRoute({ user, pathname: exp.pathname, opts: exp.opts, snapshot });
    if (actual !== exp.allowed) {
      throw new Error(
        `assertRouteProtection: ${String(user)} @ ${exp.pathname} expected allowed=${exp.allowed}, got ${actual}`,
      );
    }
  }
}
