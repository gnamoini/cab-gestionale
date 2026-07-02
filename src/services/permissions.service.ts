"use client";

import { USER_PERMISSIONS_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { loadRolePermissionKeys } from "@/src/lib/rbac/load-rbac-data";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export const permissionsService = {
  /** Permessi override dell'utente corrente. */
  async listMyPermissions(userId?: string): Promise<ServiceResult<UserPermissionRow[]>> {
    try {
      const c = getBrowserSupabase();
      let uid = userId?.trim() || null;
      if (!uid) {
        const { data: gu } = await c.auth.getUser();
        uid = gu.user?.id ?? null;
      }
      if (!uid) return success([]);

      const { data, error } = await c
        .from("user_permissions")
        .select(`${USER_PERMISSIONS_COLUMNS}, permissions(key, module, action)`)
        .eq("user_id", uid);
      if (error) return err(error.message);
      return success((data ?? []) as unknown as UserPermissionRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listMyRolePermissionKeys(userId?: string): Promise<ServiceResult<string[]>> {
    try {
      const c = getBrowserSupabase();
      let uid = userId?.trim() || null;
      if (!uid) {
        const { data: gu } = await c.auth.getUser();
        uid = gu.user?.id ?? null;
      }
      if (!uid) return success([]);

      const { data: prof } = await c.from("profiles").select("role_key").eq("id", uid).maybeSingle();
      const roleKey = prof?.role_key ?? "guest";
      const keys = await loadRolePermissionKeys(c, roleKey);
      return success(keys);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

};
