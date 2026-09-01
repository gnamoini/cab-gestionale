import { resolveRole, type RbacUser } from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/auth/rbac";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";

/** @deprecated Use useInboxEligible() — DB RPC notification_inbox_eligible() is SSOT. */
export function isClientInboxEligible(
  user: RbacUser,
  ctx?: RbacEvaluationContext,
): boolean {
  if (resolveRole(user) !== "cliente") return false;
  if (!ctx?.resolved) return false;
  return canReadPage(ctx.resolved, "lavorazioni_clienti");
}
