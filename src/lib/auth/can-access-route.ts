import { canAccessPage, type RequiredRbacContext } from "@/lib/auth/rbac";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export type CanAccessRouteInput = {
  pathname: string;
  ctx?: RequiredRbacContext;
  snapshot?: EffectivePermissionsSnapshot | null;
};

/** Accesso route — delega al resolver pagina (SSOT). */
export function canAccessRoute(input: CanAccessRouteInput): boolean {
  const effectiveCtx = input.ctx ?? input.snapshot?.rbacContext;
  if (!effectiveCtx?.resolved) return false;
  return canAccessPage(input.pathname, effectiveCtx as RequiredRbacContext);
}
