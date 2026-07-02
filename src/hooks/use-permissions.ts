"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { permissionsService } from "@/src/services/permissions.service";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { buildEffectivePermissionsByModule, type EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import {
  GESTIONALE_PERMISSION_MODULES,
  type GestionalePermissionModule,
} from "@/src/lib/permissions/gestionale-modules";
import { navHrefToSection, canWriteAnyOperational, resolveRole, type RbacSection } from "@/lib/auth/rbac";
import { gestionaleNavHrefToModule } from "@/src/lib/permissions/gestionale-modules";
import { useRbac } from "@/src/hooks/use-rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

async function fetchMyPermissions(userId: string | undefined): Promise<UserPermissionRow[]> {
  const r = await permissionsService.listMyPermissions(userId);
  if (!r.success) throw new Error(r.error ?? "Errore permessi");
  return r.data ?? [];
}

/** Role permission keys from DB (SSOT). */
export function useRolePermissionKeysQuery(): UseQueryResult<string[], Error> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, "role-keys", user?.id ?? "anon"] as const,
    queryFn: async () => {
      const r = await permissionsService.listMyRolePermissionKeys(user?.id);
      if (!r.success) throw new Error(r.error ?? "Errore permessi ruolo");
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

/** Una sola fetch per sessione (invalidare esplicitamente dopo cambio permessi admin). */
export function useUserPermissionsQuery(): UseQueryResult<UserPermissionRow[], Error> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, user?.id ?? "anon"] as const,
    queryFn: () => fetchMyPermissions(user?.id),
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
  canEditInventory: boolean;
  canManageUsers: boolean;
  canManageSecurity: boolean;
  canManageSettings: boolean;
  canEditWorkOrders: boolean;
  canEditVehicles: boolean;
  canUploadDocuments: boolean;
  canDeleteRecords: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  isLoading: boolean;
};

export type ModulePermission = EffectiveModulePermission & { isLoading: boolean };

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
    canEditInventory: rbac.hasPermission("editInventory"),
    canManageUsers: rbac.hasPermission("manageUsers"),
    canManageSecurity: rbac.hasPermission("manageSecurity"),
    canManageSettings: rbac.hasPermission("manageSettings"),
    canEditWorkOrders: rbac.hasPermission("editWorkOrders"),
    canEditVehicles: rbac.hasPermission("editVehicles"),
    canUploadDocuments: rbac.hasPermission("uploadDocuments"),
    canDeleteRecords: rbac.hasPermission("deleteRecords"),
    canViewReports: rbac.hasPermission("viewReports"),
    canViewAuditLogs: rbac.hasPermission("viewAuditLogs"),
    isLoading: authLoading,
  };
}

/** Snapshot unico — preferire nelle pagine che leggono global + modulo (evita doppia sottoscrizione). */
export function usePermissionsSnapshot(): PermissionsSnapshot {
  const rbac = useRbac();
  const { user, status } = useAuth();
  const permsQuery = useUserPermissionsQuery();
  const roleKeysQuery = useRolePermissionKeysQuery();
  const authLoading = status === "loading";
  const moduleLoading =
    authLoading || permsQuery.isLoading || roleKeysQuery.isLoading;

  const global = useMemo(
    () => buildGlobalPermissions(user, rbac, authLoading),
    [
      user,
      rbac.isAdmin,
      rbac.isOperatore,
      rbac.isOspite,
      rbac.hasPermission,
      authLoading,
    ],
  );

  const modules = useMemo(() => {
    const map = buildEffectivePermissionsByModule({
      userId: user?.id ?? "",
      roleKey: user?.roleKey ?? user?.ruolo,
      rolePermissionKeys: roleKeysQuery.data ?? [],
      permissionRows: permsQuery.data,
    });
    const out = {} as Record<GestionalePermissionModule, ModulePermission>;
    for (const mod of GESTIONALE_PERMISSION_MODULES) {
      out[mod] = { ...map[mod], isLoading: moduleLoading };
    }
    return out;
  }, [user?.id, user?.roleKey, user?.ruolo, roleKeysQuery.data, moduleLoading]);

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

const SECTION_TO_MODULE: Partial<Record<RbacSection, GestionalePermissionModule>> = {
  magazzino: "magazzino",
  preventivi: "preventivi",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  report: "report",
  documenti: "documenti",
  dipendenti: "dipendenti",
  fatturazione: "fatturazione",
  ddt: "ddt",
};

/** Nav ERP: `user_permissions` per modulo operativo; capability RBAC per security/impostazioni. */
export function useNavHrefPermission(href: string): { canRead: boolean; canWrite: boolean; isLoading: boolean } {
  const rbac = useRbac();
  const { user, status } = useAuth();
  const permsQuery = useUserPermissionsQuery();
  const roleKeysQuery = useRolePermissionKeysQuery();
  const moduleFromHref = gestionaleNavHrefToModule(href);
  const section = navHrefToSection(href);

  return useMemo(() => {
    if (!section) {
      return { canRead: true, canWrite: canWriteAnyOperational(rbac.user), isLoading: rbac.isLoading };
    }

    const mod = moduleFromHref ?? SECTION_TO_MODULE[section];
    if (mod) {
      const map = buildEffectivePermissionsByModule({
        userId: user?.id ?? "",
        roleKey: user?.roleKey ?? user?.ruolo,
        rolePermissionKeys: roleKeysQuery.data ?? [],
        permissionRows: permsQuery.data,
      });
      const row = map[mod];
      return {
        canRead: row.canRead,
        canWrite: row.canWrite,
        isLoading:
          rbac.isLoading ||
          status === "loading" ||
          permsQuery.isLoading ||
          roleKeysQuery.isLoading,
      };
    }

    return {
      canRead: rbac.canRead(section),
      canWrite: rbac.canWrite(section),
      isLoading: rbac.isLoading,
    };
  }, [
    section,
    moduleFromHref,
    rbac.user,
    rbac.isLoading,
    rbac.canRead,
    rbac.canWrite,
    user?.id,
    user?.roleKey,
    user?.ruolo,
    roleKeysQuery.data,
    roleKeysQuery.isLoading,
    permsQuery.data,
    permsQuery.isLoading,
    status,
  ]);
}
