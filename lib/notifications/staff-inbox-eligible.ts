import { resolveRole, type RbacEvaluationContext } from "@/lib/auth/rbac";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";

/** @deprecated Use useStaffInboxEligibleRpc() or resolveNotificationStaffInboxEligible() — DB RPC is SSOT. */
export function isStaffInboxEligible(
  user: import("@/lib/auth/rbac").RbacUser,
  ctx?: RbacEvaluationContext,
): boolean {
  const role = resolveRole(user);
  if (role === "guest" || role === "cliente") return false;
  if (!ctx?.resolved) return false;
  return canReadPage(ctx.resolved, "dashboard") || canReadPage(ctx.resolved, "lavorazioni");
}
