import {
  CAPABILITIES,
  type Capability,
  type CanonicalRole,
  CANONICAL_ROLES,
  LEGACY_ROLE_MAP,
  ROLE_LABELS,
} from "@/lib/rbac";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";

export type PermissionEffect = "allow" | "deny";

export type UserPermissionOverrideInput = {
  permissionKey: string;
  effect: PermissionEffect;
};

export type ResolveUserPermissionsInput = {
  userId: string;
  roleKey: string;
  rolePermissionKeys: string[];
  userOverrides: UserPermissionOverrideInput[];
};

export type ResolvedPermissions = {
  userId: string;
  roleKey: string;
  allowedKeys: Set<string>;
  capabilities: Record<Capability, boolean>;
  modules: Record<GestionalePermissionModule, EffectiveModulePermission>;
};

function normalizeRoleKey(raw: string | null | undefined): string {
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}

function roleAllows(rolePermissionKeys: readonly string[], key: string): boolean {
  return rolePermissionKeys.includes(key);
}

/** Merge: deny > allow override > role allow > default deny. Admin bypass. */
export function resolveUserPermissions(input: ResolveUserPermissionsInput): ResolvedPermissions {
  const roleKey = normalizeRoleKey(input.roleKey);
  const allowedKeys = new Set<string>();
  const overrideByKey = new Map<string, PermissionEffect>();
  for (const o of input.userOverrides) {
    overrideByKey.set(o.permissionKey, o.effect);
  }

  const isAdmin = roleKey === "admin";
  const allKeys = new Set<string>([
    ...GESTIONALE_PERMISSION_MODULES.flatMap((m) => [`${m}.read`, `${m}.write`]),
    ...CAPABILITIES,
  ]);

  for (const key of allKeys) {
    if (isAdmin) {
      allowedKeys.add(key);
      continue;
    }
    const override = overrideByKey.get(key);
    if (override === "deny") continue;
    if (override === "allow") {
      allowedKeys.add(key);
      continue;
    }
    if (roleAllows(input.rolePermissionKeys, key)) {
      allowedKeys.add(key);
    }
  }

  const capabilities = {} as Record<Capability, boolean>;
  for (const cap of CAPABILITIES) {
    capabilities[cap] = allowedKeys.has(cap);
  }

  const modules = {} as Record<GestionalePermissionModule, EffectiveModulePermission>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    modules[m] = {
      canRead: allowedKeys.has(`${m}.read`),
      canWrite: allowedKeys.has(`${m}.write`),
    };
  }

  return {
    userId: input.userId,
    roleKey: roleKey as CanonicalRole,
    allowedKeys,
    capabilities,
    modules,
  };
}

export function canAccess(resolved: ResolvedPermissions, permissionKey: string): boolean {
  return resolved.allowedKeys.has(permissionKey);
}

export function canReadModule(resolved: ResolvedPermissions, module: GestionalePermissionModule): boolean {
  return canAccess(resolved, `${module}.read`);
}

export function canWriteModule(resolved: ResolvedPermissions, module: GestionalePermissionModule): boolean {
  return canAccess(resolved, `${module}.write`);
}

export function hasResolvedCapability(resolved: ResolvedPermissions, capability: Capability): boolean {
  return resolved.capabilities[capability] ?? false;
}

export { normalizeRoleKey, ROLE_LABELS };
