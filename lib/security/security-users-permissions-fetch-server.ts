import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import { listUsersByAdminAction } from "@/src/actions/admin-users";
import type { SecurityUserAdminRow } from "@/src/actions/admin-users.types";
import { resolveRole } from "@/lib/auth/rbac";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import {
  loadAllRolePageAccess,
  loadAllUserPageOverrideRows,
  listAllRoles,
} from "@/src/lib/rbac/load-rbac-data";
import { hasPagePermissionOverrides } from "@/lib/security/user-page-permissions";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { SecurityUserPermissionRow } from "@/src/actions/security-users-permissions";
import type { SecurityUsersQueryData } from "@/src/hooks/use-security-users-permissions-query";
import { err, success, type ServiceResult } from "@/src/services/service-result";

function roleGrantsClientPortal(rolePageAccess: Record<string, PageAccessLevel>, roleKey: string): boolean {
  const access = rolePageAccess.lavorazioni_clienti ?? seedPageAccessForRole(roleKey).lavorazioni_clienti ?? "none";
  return access === "read" || access === "write";
}

function toPermissionRow(
  user: SecurityUserAdminRow,
  userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[],
  rolePageAccessByRole: Map<string, Record<string, PageAccessLevel>>,
): SecurityUserPermissionRow {
  const roleKey = resolveRole(user.ruolo);
  const rolePageAccess = rolePageAccessByRole.get(roleKey) ?? seedPageAccessForRole(roleKey);
  const fromRole = roleGrantsClientPortal(rolePageAccess, roleKey);
  return {
    ...user,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole,
    hasPagePermissionOverrides: hasPagePermissionOverrides(user.id, userPageOverrideRows),
  };
}

/** Read-only security users + RBAC matrix — request-scoped cache per SSR BFF. */
export const fetchSecurityUsersPermissionsServer = cache(
  async (): Promise<ServiceResult<SecurityUsersQueryData>> => {
    const admin = await assertAdminCaller();
    if (!admin.ok) return err(admin.message);

    const usersRes = await listUsersByAdminAction();
    if (!usersRes.ok) return err(usersRes.message);

    const serviceAdmin = createClient(admin.url, admin.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userIds = usersRes.users.map((u) => u.id);
    const userPageOverrideRows = await loadAllUserPageOverrideRows(serviceAdmin, userIds);

    const assignableRoles = (await listAllRoles(serviceAdmin))
      .filter((r) => r.is_active)
      .map((r) => ({ key: r.key, name: r.name }));

    const rolePageAccessMap = await loadAllRolePageAccess(serviceAdmin);
    const uniqueRoles = [
      ...new Set([...usersRes.users.map((u) => resolveRole(u.ruolo)), ...assignableRoles.map((r) => r.key)]),
    ];
    for (const rk of uniqueRoles) {
      if (!rolePageAccessMap.has(rk)) {
        rolePageAccessMap.set(rk, seedPageAccessForRole(rk));
      }
    }

    const users = usersRes.users.map((u) => toPermissionRow(u, userPageOverrideRows, rolePageAccessMap));
    const rolePageAccessByRole = Object.fromEntries(rolePageAccessMap);

    return success({
      users,
      userPageOverrideRows,
      rolePageAccessByRole,
      assignableRoles,
    });
  },
);
