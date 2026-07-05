import { CANONICAL_ROLES, LEGACY_ROLE_MAP, type CanonicalRole } from "@/lib/rbac";
import {
  allGestionalePageKeys,
  expandPageToModuleKeys,
  GESTIONALE_PAGES,
  pageAccessFromLevel,
  pathnameToPage,
  type GestionalePage,
  type GestionalePageKey,
  type PageAccessLevel,
} from "@/src/lib/permissions/gestionale-pages";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";

export type PageAccess = {
  level: PageAccessLevel;
  canRead: boolean;
  canWrite: boolean;
  visible: boolean;
};

export type ResolvedPageAccess = {
  userId: string;
  roleKey: CanonicalRole;
  pages: Record<GestionalePageKey, PageAccess>;
  expandedModuleKeys: Set<string>;
  modules: Record<GestionalePermissionModule, { canRead: boolean; canWrite: boolean }>;
};

export type ResolvePageAccessInput = {
  userId: string;
  roleKey: string;
  rolePageAccess: Record<string, PageAccessLevel>;
  userPageOverrides: Record<string, PageAccessLevel>;
};

function normalizeRoleKey(raw: string | null | undefined): CanonicalRole {
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}

function resolveLevelForPage(
  roleKey: CanonicalRole,
  pageKey: GestionalePageKey,
  rolePageAccess: Record<string, PageAccessLevel>,
  userPageOverrides: Record<string, PageAccessLevel>,
): PageAccessLevel {
  if (roleKey === "admin") return "write";
  if (pageKey in userPageOverrides) return userPageOverrides[pageKey]!;
  if (pageKey in rolePageAccess) return rolePageAccess[pageKey]!;
  return "none";
}

function buildModuleMap(expandedKeys: Set<string>): Record<GestionalePermissionModule, { canRead: boolean; canWrite: boolean }> {
  const modules = {} as Record<GestionalePermissionModule, { canRead: boolean; canWrite: boolean }>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    modules[m] = {
      canRead: expandedKeys.has(`${m}.read`),
      canWrite: expandedKeys.has(`${m}.write`),
    };
  }
  return modules;
}

/** Unico resolver RBAC runtime — admin bypass solo qui. */
export function resolvePageAccess(input: ResolvePageAccessInput): ResolvedPageAccess {
  const roleKey = normalizeRoleKey(input.roleKey);
  const pages = {} as Record<GestionalePageKey, PageAccess>;
  const expandedModuleKeys = new Set<string>();

  for (const page of GESTIONALE_PAGES) {
    const level = resolveLevelForPage(roleKey, page.key as GestionalePageKey, input.rolePageAccess, input.userPageOverrides);
    pages[page.key as GestionalePageKey] = pageAccessFromLevel(level);
    for (const key of expandPageToModuleKeys(page, level)) {
      expandedModuleKeys.add(key);
    }
  }

  return {
    userId: input.userId,
    roleKey,
    pages,
    expandedModuleKeys,
    modules: buildModuleMap(expandedModuleKeys),
  };
}

export function getPageAccess(resolved: ResolvedPageAccess, pageKey: GestionalePageKey): PageAccess {
  return resolved.pages[pageKey] ?? pageAccessFromLevel("none");
}

export function canReadPage(resolved: ResolvedPageAccess, pageKey: GestionalePageKey): boolean {
  return getPageAccess(resolved, pageKey).canRead;
}

export function canWritePage(resolved: ResolvedPageAccess, pageKey: GestionalePageKey): boolean {
  return getPageAccess(resolved, pageKey).canWrite;
}

export function isPageVisible(resolved: ResolvedPageAccess, pageKey: GestionalePageKey): boolean {
  return getPageAccess(resolved, pageKey).visible;
}

export function pathnameToPageAccess(resolved: ResolvedPageAccess, pathname: string): PageAccess | null {
  const page = pathnameToPage(pathname);
  if (!page) return null;
  return getPageAccess(resolved, page.key as GestionalePageKey);
}

export function canAccessPathname(resolved: ResolvedPageAccess, pathname: string): boolean {
  const access = pathnameToPageAccess(resolved, pathname);
  if (!access) return true;
  return access.visible;
}

export function canWritePathname(resolved: ResolvedPageAccess, pathname: string): boolean {
  const access = pathnameToPageAccess(resolved, pathname);
  if (!access) return false;
  return access.canWrite;
}

export function moduleAllowsFromResolved(
  resolved: ResolvedPageAccess,
  module: GestionalePermissionModule,
  op: "read" | "write",
): boolean {
  const m = resolved.modules[module];
  return op === "read" ? m.canRead : m.canWrite;
}

export { allGestionalePageKeys, normalizeRoleKey };
