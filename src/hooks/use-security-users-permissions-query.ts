"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listSecurityUsersPermissionsAction,
  type SecurityUserPermissionRow,
} from "@/src/actions/security-users-permissions";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

/** Dato normalizzato in cache React Query — sempre stessa shape. */
export type SecurityUsersQueryData = {
  users: SecurityUserPermissionRow[];
  userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[];
  rolePageAccessByRole: Record<string, Record<string, PageAccessLevel>>;
  assignableRoles: { key: string; name: string }[];
};

export async function fetchSecurityUsersPermissionsQuery(): Promise<SecurityUsersQueryData> {
  const res = await listSecurityUsersPermissionsAction();
  if (!res.ok) throw new Error(res.message);
  return {
    users: res.users,
    userPageOverrideRows: res.userPageOverrideRows,
    rolePageAccessByRole: res.rolePageAccessByRole,
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
    userPageOverrideRows: query.data?.userPageOverrideRows ?? [],
    rolePageAccessByRole: query.data?.rolePageAccessByRole ?? {},
    assignableRoles: query.data?.assignableRoles ?? [],
  };
}
