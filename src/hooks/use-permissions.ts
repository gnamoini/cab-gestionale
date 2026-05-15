"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { buildEffectivePermissionsByModule, type EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { gestionaleNavHrefToModule } from "@/src/lib/permissions/gestionale-modules";
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

/**
 * Permessi effettivi per un modulo ERP (ruolo + righe `user_permissions`).
 * Allineato a `buildEffectivePermissionsByModule` / logica `user_effective_can`:
 * finché le righe non sono ancora arrivate da React Query, si applica il fallback ruolo
 * (admin/tecnico/viewer), senza forzare `canWrite: false` durante il fetch.
 */
export function usePermissions(module: GestionalePermissionModule): EffectiveModulePermission & {
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const q = useUserPermissionsQuery();
  const ruolo = user?.ruolo;
  const map = buildEffectivePermissionsByModule(ruolo, q.data);
  const row = map[module];
  const permissionsRowsStillLoading =
    isAuthSessionEstablished(status) &&
    !!user?.id &&
    q.data === undefined &&
    (q.isPending || q.isFetching);
  const isLoading = status === "loading" || permissionsRowsStillLoading;
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
