"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listSecurityUsersPermissionsAction,
  type SecurityUserPermissionRow,
} from "@/src/actions/security-users-permissions";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

/** Dato normalizzato in cache React Query — sempre stessa shape. */
export type SecurityUsersQueryData = {
  users: SecurityUserPermissionRow[];
  portalSettingsUpdatedAt: string | null;
  permissionRows: UserPermissionRow[];
  rolePermissionKeysByRole: Record<string, string[]>;
  assignableRoles: { key: string; name: string }[];
};

export async function fetchSecurityUsersPermissionsQuery(): Promise<SecurityUsersQueryData> {
  const res = await listSecurityUsersPermissionsAction();
  if (!res.ok) throw new Error(res.message);
  return {
    users: res.users,
    portalSettingsUpdatedAt: res.portalSettingsUpdatedAt,
    permissionRows: res.permissionRows,
    rolePermissionKeysByRole: res.rolePermissionKeysByRole,
    assignableRoles: res.assignableRoles,
  };
}

/** Estrae sempre un array utenti da dati query (difensivo). */
export function securityUsersFromQueryData(data: SecurityUsersQueryData | undefined): SecurityUserPermissionRow[] {
  if (!data) return [];
  return Array.isArray(data.users) ? data.users : [];
}

export function useSecurityUsersPermissionsQuery(enabled = true) {
  const query = useQuery({
    queryKey: QK.securityUsersPermissions,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: fetchSecurityUsersPermissionsQuery,
  });

  const users = securityUsersFromQueryData(query.data);

  return {
    ...query,
    users,
    portalSettingsUpdatedAt: query.data?.portalSettingsUpdatedAt ?? null,
    permissionRows: query.data?.permissionRows ?? [],
    rolePermissionKeysByRole: query.data?.rolePermissionKeysByRole ?? {},
    assignableRoles: query.data?.assignableRoles ?? [],
  };
}
