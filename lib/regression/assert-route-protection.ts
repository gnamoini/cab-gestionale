import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export type RouteProtectionExpectation = {
  pathname: string;
  allowed: boolean;
};

/** Verifica matrice path × snapshot (fail-fast con messaggio). */
export function assertRouteProtection(
  _user: unknown,
  expectations: RouteProtectionExpectation[],
  snapshot?: EffectivePermissionsSnapshot | null,
): void {
  for (const exp of expectations) {
    const actual = canAccessRoute({ pathname: exp.pathname, snapshot });
    if (actual !== exp.allowed) {
      throw new Error(
        `assertRouteProtection: ${exp.pathname} expected allowed=${exp.allowed}, got ${actual}`,
      );
    }
  }
}
