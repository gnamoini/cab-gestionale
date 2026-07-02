import type { CanonicalRole } from "@/lib/rbac";

/** Può pubblicare il digest fatture scadute (scope addetto_amministrativo). */
export function canPublishFattureScaduteDigest(role: CanonicalRole | string | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "addetto_amministrativo";
}
