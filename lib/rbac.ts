/**
 * RBAC static config + seed aliases.
 * Runtime permissions: Postgres SSOT via resolvePageAccess (src/lib/rbac/resolve-page-access.ts).
 */

import type { ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import {
  RBAC_SEED_CANONICAL_ROLES,
  RBAC_SEED_CAPABILITIES,
  RBAC_SEED_ROLE_CAPABILITIES,
  RBAC_SEED_ROLE_MODULE_DEFAULTS,
  type RbacSeedCapability,
  type RbacSeedRole,
} from "@/lib/rbac-seed";

export const CANONICAL_ROLES = RBAC_SEED_CANONICAL_ROLES;
export type CanonicalRole = RbacSeedRole;

export const ROLE_LABELS: Record<CanonicalRole, string> = {
  admin: "Admin",
  manager: "Direttore",
  operatore: "Personale Tecnico",
  addetto_amministrativo: "Personale Amministrativo",
  guest: "Ospite",
  cliente: "Cliente",
};

export const CAPABILITIES = RBAC_SEED_CAPABILITIES;
export type Capability = RbacSeedCapability;

export type RbacEvaluationContext = {
  operatorGlobalSettingsDbEnabled?: boolean;
  resolved?: ResolvedPageAccess;
};

/** Runtime auth checks require a resolved snapshot — fail-closed without it. */
export type RequiredRbacContext = RbacEvaluationContext & {
  resolved: ResolvedPageAccess;
};

/** @deprecated Seed only — not used at runtime. */
export const ROLE_MODULE_DEFAULTS = RBAC_SEED_ROLE_MODULE_DEFAULTS;

/** @deprecated Seed only — not used at runtime. */
export const ROLE_CAPABILITIES = RBAC_SEED_ROLE_CAPABILITIES;

/** Legacy DB / JWT → ruolo canonico key. */
export const LEGACY_ROLE_MAP: Record<string, CanonicalRole> = {
  tecnico: "operatore",
  magazziniere: "operatore",
  commerciale: "addetto_amministrativo",
  ospite: "guest",
  viewer: "guest",
  sola_lettura: "guest",
};

export type RbacUserInput =
  | { ruolo?: string | null; roleKey?: string | null; id?: string | null }
  | string
  | null
  | undefined;

function rawRoleKey(user: RbacUserInput): string | null {
  if (user == null) return null;
  if (typeof user === "string") return user;
  return user.roleKey ?? user.ruolo ?? null;
}

export function resolveCanonicalRole(user: RbacUserInput): CanonicalRole {
  const raw = rawRoleKey(user);
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}

export const RBAC_DENIED_MESSAGE = "Non hai i permessi per eseguire questa azione.";

export const APP_ROLES = CANONICAL_ROLES;
export type AppRole = CanonicalRole;
export const resolveRole = resolveCanonicalRole;

/** Pilot operatore impostazioni globali — usato da production-readiness e resolve-pilot-settings. */
export { isOperatorGlobalSettingsEnabled } from "@/lib/permissions/operator-global-settings";
