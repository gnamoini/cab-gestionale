import { resolveRole, type RbacUser } from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";

/** Policy A: guest e cliente esclusi dall'inbox. */
export function isStaffInboxEligible(
  user: RbacUser,
  ctx?: RbacEvaluationContext,
): boolean {
  const role = resolveRole(user);
  if (role === "guest" || role === "cliente") return false;
  if (!ctx?.resolved) return false;
  return hasResolvedCapability(ctx.resolved, "can_read_operational");
}
