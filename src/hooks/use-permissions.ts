"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { buildEffectivePermissionsByModule, type EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { navHrefToSection, canWriteAnyOperational, resolveRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { permissionsService } from "@/src/services/permissions.service";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

async function fetchMyPermissions(): Promise<UserPermissionRow[]> {
  const r = await permissionsService.listMyPermissions();
  if (!r.success) throw new Error(r.error ?? "Errore permessi");
  return r.data ?? [];
}

/** Una sola fetch per sessione (invalidare esplicitamente dopo cambio permessi admin). */
export function useUserPermissionsQuery(): UseQueryResult<UserPermissionRow[], Error> {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: [...QK.userPermissions, user?.id ?? "anon"] as const,
    queryFn: fetchMyPermissions,
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

export function usePermissions(): GlobalPermissions;
export function usePermissions(module: GestionalePermissionModule): EffectiveModulePermission & {
  isLoading: boolean;
};
export function usePermissions(module?: GestionalePermissionModule): GlobalPermissions | (EffectiveModulePermission & { isLoading: boolean }) {
  const rbac = useRbac();
  const { user, status } = useAuth();
  const ruolo = user?.ruolo;
  const isLoading = status === "loading";

  if (!module) {
    return {
      role: rbac.role,
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
      isLoading,
    };
  }

  const map = buildEffectivePermissionsByModule(ruolo, undefined);
  const row = map[module];
  return { ...row, isLoading };
}

/** Lettura nav: usa matrice RBAC centralizzata. */
export function useNavHrefPermission(href: string): { canRead: boolean; canWrite: boolean; isLoading: boolean } {
  const rbac = useRbac();
  const section = navHrefToSection(href);
  if (!section) {
    return { canRead: true, canWrite: canWriteAnyOperational(rbac.user), isLoading: rbac.isLoading };
  }
  return {
    canRead: rbac.canRead(section),
    canWrite: rbac.canWrite(section),
    isLoading: rbac.isLoading,
  };
}
