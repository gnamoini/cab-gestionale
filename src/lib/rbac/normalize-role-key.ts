import { resolveCanonicalRole, type CanonicalRole } from "@/lib/rbac";

/** Normalizza chiave ruolo legacy → canonica (guest se sconosciuto). */
export function normalizeRoleKey(raw: string | null | undefined): CanonicalRole {
  return resolveCanonicalRole(raw);
}
