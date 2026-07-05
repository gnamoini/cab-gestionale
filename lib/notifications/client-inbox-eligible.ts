import { resolveRole, type RbacUser } from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";

/** Portale clienti: inbox solo ingresso/completata proprie macchine. */
export function isClientInboxEligible(
  user: RbacUser,
  ctx?: RbacEvaluationContext,
): boolean {
  if (resolveRole(user) !== "cliente") return false;
  if (!ctx?.resolved) return false;
  return hasResolvedCapability(ctx.resolved, "can_access_client_area");
}
