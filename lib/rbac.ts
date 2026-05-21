/**
 * RBAC capability — single source of truth (frontend).
 * Allineato a public.rbac_has_capability() in Supabase.
 */

export const CANONICAL_ROLES = ["admin", "manager", "operatore", "cliente", "guest"] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export const CAPABILITIES = [
  "can_read_operational",
  "can_write_operational",
  "can_manage_settings",
  "can_manage_security",
  "can_access_client_area",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Legacy DB / JWT → ruolo canonico. */
const LEGACY_ROLE_MAP: Record<string, CanonicalRole> = {
  tecnico: "operatore",
  magazziniere: "operatore",
  commerciale: "operatore",
  ospite: "guest",
  viewer: "guest",
  sola_lettura: "guest",
};

export type RbacUserInput =
  | { ruolo?: string | null; id?: string | null }
  | string
  | null
  | undefined;

function rawRole(user: RbacUserInput): string | null {
  if (user == null) return null;
  if (typeof user === "string") return user;
  return user.ruolo ?? null;
}

/** Normalizza verso ruolo canonico. */
export function resolveCanonicalRole(user: RbacUserInput): CanonicalRole {
  const raw = rawRole(user);
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}

/** Matrice ruolo → capability (unica). Admin: tutte true. */
export const ROLE_CAPABILITIES: Record<CanonicalRole, Record<Capability, boolean>> = {
  admin: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: true,
    can_manage_security: true,
    can_access_client_area: true,
  },
  manager: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: true,
    can_manage_security: false,
    can_access_client_area: true,
  },
  operatore: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: true,
    can_manage_security: false,
    can_access_client_area: true,
  },
  cliente: {
    can_read_operational: false,
    can_write_operational: false,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: true,
  },
  guest: {
    can_read_operational: true,
    can_write_operational: false,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: false,
  },
};

/** Verifica capability per utente (allineato a rbac_has_capability DB). */
export function hasCapability(user: RbacUserInput, capability: Capability): boolean {
  const role = resolveCanonicalRole(user);
  if (role === "admin") return true;
  return ROLE_CAPABILITIES[role][capability];
}

export const RBAC_DENIED_MESSAGE = "Operazione non consentita per il tuo ruolo.";

/** @deprecated Usare CANONICAL_ROLES / resolveCanonicalRole. */
export const APP_ROLES = CANONICAL_ROLES;
export type AppRole = CanonicalRole;
export const resolveRole = resolveCanonicalRole;
