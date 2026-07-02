import { resolveRole, type RbacUser } from "@/lib/auth/rbac";
import { hasCapability, type RbacEvaluationContext } from "@/lib/rbac";

/** Policy A: guest e cliente esclusi dall'inbox. */
export function isStaffInboxEligible(
  user: RbacUser,
  ctx?: RbacEvaluationContext,
): boolean {
  const role = resolveRole(user);
  if (role === "guest" || role === "cliente") return false;
  return hasCapability(user, "can_read_operational", ctx);
}
