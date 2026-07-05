"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { permissionsService } from "@/src/services/permissions.service";
import { isRbacPageTableUnavailableError } from "@/src/lib/rbac/load-rbac-data";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  GESTIONALE_PERMISSION_MODULES,
  type GestionalePermissionModule,
} from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PAGES, pathnameToPage } from "@/src/lib/permissions/gestionale-pages";
import { resolveRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

export function useRolePageAccessQuery(): UseQueryResult<Record<string, PageAccessLevel>, Error> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, "role-page-access", user?.id ?? "anon"] as const,
    queryFn: async () => {
      const r = await permissionsService.listMyRolePageAccess(user?.id);
      if (!r.success) {
        if (isRbacPageTableUnavailableError(r.error)) return {};
        throw new Error(r.error ?? "Errore permessi ruolo");
      }
      return r.data ?? {};
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
      const r = await permissionsService.listMyPageOverrides(user?.id);
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
  rbac: ReturnType<typeof useRbac>,
  authLoading: boolean,
): GlobalPermissions {
  return {
    role: resolveRole(user),
    isAdmin: rbac.isAdmin,
    isOperatore: rbac.isOperatore,
    isOspite: rbac.isOspite,
    canManageSecurity: rbac.canWritePage("sicurezza"),
    canManageSettings: rbac.canWritePage("impostazioni"),
    canEditInventory: rbac.canWritePage("magazzino"),
    canEditWorkOrders: rbac.canWritePage("lavorazioni"),
    canEditVehicles: rbac.canWritePage("mezzi"),
    canUploadDocuments: rbac.canWritePage("documenti"),
    canViewReports: rbac.canReadPage("report"),
    canDeleteRecords:
      !rbac.isReadOnly &&
      GESTIONALE_PAGES.some((p) => rbac.canWritePage(p.key as import("@/src/lib/permissions/gestionale-pages").GestionalePageKey)),
    isLoading: authLoading,
  };
}

export function usePermissionsSnapshot(): PermissionsSnapshot {
  const rbac = useRbac();
  const { user, status } = useAuth();
  const authLoading = status === "loading" || rbac.isLoading;

  const global = useMemo(
    () => buildGlobalPermissions(user, rbac, authLoading),
    [user, rbac, authLoading],
  );

  const modules = useMemo(() => {
    const resolved = rbac.effectivePermissions?.resolved;
    const out = {} as Record<GestionalePermissionModule, ModulePermission>;
    for (const mod of GESTIONALE_PERMISSION_MODULES) {
      const row = resolved?.modules[mod] ?? { canRead: false, canWrite: false };
      out[mod] = { ...row, isLoading: authLoading };
    }
    return out;
  }, [rbac.effectivePermissions?.resolved, authLoading]);

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
