import { CANONICAL_ROLES, LEGACY_ROLE_MAP, type CanonicalRole } from "@/lib/rbac";

/** Normalizza chiave ruolo legacy → canonica (guest se sconosciuto). */
export function normalizeRoleKey(raw: string | null | undefined): CanonicalRole {
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}
