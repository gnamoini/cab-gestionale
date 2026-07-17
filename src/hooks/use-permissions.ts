"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { permissionsEntry } from "@/lib/domain/permissions-entry";
import { isRbacPageTableUnavailableError } from "@/src/lib/rbac/load-rbac-data";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  GESTIONALE_PERMISSION_MODULES,
  type GestionalePermissionModule,
} from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PAGES, pathnameToPage } from "@/src/lib/permissions/gestionale-pages";
import { resolveRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { canReadPage, canWritePage } from "@/src/lib/rbac/resolve-page-access";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { PageAccessLevel, GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export function useRolePageAccessQuery(): UseQueryResult<import("@/src/services/permissions.service").RolePageAccessBundle, Error> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, "role-page-access", user?.id ?? "anon"] as const,
    queryFn: async () => {
      const r = await permissionsEntry.listMyRolePageAccess(user?.id);
      if (!r.success) {
        if (isRbacPageTableUnavailableError(r.error)) return { roleKey: "guest", rolePageAccess: {} };
        throw new Error(r.error ?? "Errore permessi ruolo");
      }
      return r.data ?? { roleKey: "guest", rolePageAccess: {} };
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useUserPageOverridesQuery(): UseQueryResult<
  { page_key: string; access_level: PageAccessLevel }[],
  Error
> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, user?.id ?? "anon"] as const,
    queryFn: async () => {
      const r = await permissionsEntry.listMyPageOverrides(user?.id);
      if (!r.success) {
        if (isRbacPageTableUnavailableError(r.error)) return [];
        throw new Error(r.error ?? "Errore override pagina");
      }
      return r.data ?? [];
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export type GlobalPermissions = {
  role: ReturnType<typeof resolveRole>;
  isAdmin: boolean;
  isOperatore: boolean;
  isOspite: boolean;
  canManageSecurity: boolean;
  canManageSettings: boolean;
  canEditInventory: boolean;
  canEditWorkOrders: boolean;
  canEditVehicles: boolean;
  canUploadDocuments: boolean;
  canViewReports: boolean;
  canDeleteRecords: boolean;
  isLoading: boolean;
};

export type ModulePermission = { canRead: boolean; canWrite: boolean; isLoading: boolean };

export type PermissionsSnapshot = {
  global: GlobalPermissions;
  modules: Record<GestionalePermissionModule, ModulePermission>;
};

function buildGlobalPermissions(
  user: ReturnType<typeof useAuth>["user"],
  role: string,
  resolved: EffectivePermissionsSnapshot["resolved"] | undefined,
  authLoading: boolean,
): GlobalPermissions {
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isOperatore = role === "operatore" || role === "manager";
  const isGuest = role === "guest";
  const isReadOnly = role === "guest" || role === "cliente";

  return {
    role: resolveRole(user),
    isAdmin,
    isOperatore,
    isOspite: isGuest,
    canManageSecurity: resolved ? canWritePage(resolved, "sicurezza") : false,
    canManageSettings: resolved ? canWritePage(resolved, "impostazioni") : false,
    canEditInventory: resolved ? canWritePage(resolved, "magazzino") : false,
    canEditWorkOrders: resolved ? canWritePage(resolved, "lavorazioni") : false,
    canEditVehicles: resolved ? canWritePage(resolved, "mezzi") : false,
    canUploadDocuments: resolved ? canWritePage(resolved, "documenti") : false,
    canViewReports: resolved ? canReadPage(resolved, "report") : false,
    canDeleteRecords:
      !isReadOnly &&
      Boolean(
        resolved &&
          GESTIONALE_PAGES.some((p) => canWritePage(resolved, p.key as GestionalePageKey)),
      ),
    isLoading: authLoading,
  };
}

export function usePermissionsSnapshot(): PermissionsSnapshot {
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { user, status } = useAuth();
  const authLoading = status === "loading" || permsLoading;
  const resolved = snapshot?.resolved;
  const role = snapshot?.role ?? user?.ruolo ?? "guest";

  const global = useMemo(
    () => buildGlobalPermissions(user, role, resolved, authLoading),
    [user, role, resolved, authLoading],
  );

  const modules = useMemo(() => {
    const out = {} as Record<GestionalePermissionModule, ModulePermission>;
    for (const mod of GESTIONALE_PERMISSION_MODULES) {
      const row = resolved?.modules[mod] ?? { canRead: false, canWrite: false };
      out[mod] = { ...row, isLoading: authLoading };
    }
    return out;
  }, [resolved, authLoading]);

  return useMemo(() => ({ global, modules }), [global, modules]);
}

export function usePermissions(): GlobalPermissions;
export function usePermissions(module: GestionalePermissionModule): ModulePermission;
export function usePermissions(
  module?: GestionalePermissionModule,
): GlobalPermissions | ModulePermission {
  const snapshot = usePermissionsSnapshot();
  if (!module) return snapshot.global;
  return snapshot.modules[module];
}

export { useUserPageOverridesQuery as useUserPermissionsQuery };

export function useNavHrefPermission(href: string): { canRead: boolean; canWrite: boolean; isLoading: boolean } {
  const rbac = useRbac();
  const page = pathnameToPage(href);
  return useMemo(() => {
    if (!page) return { canRead: true, canWrite: false, isLoading: rbac.isLoading };
    const key = page.key as GestionalePageKey;
    return {
      canRead: rbac.canReadPage(key),
      canWrite: rbac.canWritePage(key),
      isLoading: rbac.isLoading,
    };
  }, [page, rbac.canReadPage, rbac.canWritePage, rbac.isLoading]);
}
