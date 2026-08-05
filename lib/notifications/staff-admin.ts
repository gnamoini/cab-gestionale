import { resolveCanonicalRole } from "@/lib/rbac";

/** Admin operativo: admin + Direttore (manager). */
export function isStaffAdminRole(roleKey: string | null | undefined): boolean {
  const canonical = resolveCanonicalRole(roleKey);
  return canonical === "admin" || canonical === "manager";
}
