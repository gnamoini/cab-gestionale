"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { buildEffectivePermissionsByModule, type EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { gestionaleNavHrefToModule } from "@/src/lib/permissions/gestionale-modules";
import { hasPermission, normalizeRole } from "@/src/lib/auth/permissions";
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
  role: ReturnType<typeof normalizeRole>;
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
  const { user, status } = useAuth();
  const ruolo = user?.ruolo;
  const isLoading = status === "loading";

  if (!module) {
    const role = normalizeRole(ruolo);
    return {
      role,
      isAdmin: role === "admin",
      isOperatore: role === "operatore",
      isOspite: role === "ospite",
      canEditInventory: hasPermission(role, "editInventory"),
      canManageUsers: hasPermission(role, "manageUsers"),
      canManageSecurity: hasPermission(role, "manageSecurity"),
      canManageSettings: hasPermission(role, "manageSettings"),
      canEditWorkOrders: hasPermission(role, "editWorkOrders"),
      canEditVehicles: hasPermission(role, "editVehicles"),
      canUploadDocuments: hasPermission(role, "uploadDocuments"),
      canDeleteRecords: hasPermission(role, "deleteRecords"),
      canViewReports: hasPermission(role, "viewReports"),
      canViewAuditLogs: hasPermission(role, "viewAuditLogs"),
      isLoading,
    };
  }

  const map = buildEffectivePermissionsByModule(ruolo, undefined);
  const row = map[module];
  return { ...row, isLoading };
}

/** Lettura nav: href senza modulo dedicato → accesso consentito (interno). */
export function useNavHrefPermission(href: string): { canRead: boolean; canWrite: boolean; isLoading: boolean } {
  const mod = gestionaleNavHrefToModule(href);
  if (!mod) {
    return { canRead: true, canWrite: true, isLoading: false };
  }
  const p = usePermissions(mod);
  return { canRead: p.canRead, canWrite: p.canWrite, isLoading: p.isLoading };
}
