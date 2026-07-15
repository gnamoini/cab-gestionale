"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { fetchRbacRoleKeyForUser } from "@/lib/rbac/fetch-rbac-role-key";
import {
  loadRolePageAccess,
  loadUserPageOverrides,
} from "@/src/lib/rbac/load-rbac-data";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type RolePageAccessBundle = {
  roleKey: string;
  rolePageAccess: Record<string, PageAccessLevel>;
};

export const permissionsService = {
  async listMyRolePageAccess(userId?: string): Promise<ServiceResult<RolePageAccessBundle>> {
    try {
      const c = getBrowserSupabase();
      let uid = userId?.trim() || null;
      if (!uid) {
        const { data: gu } = await c.auth.getUser();
        uid = gu.user?.id ?? null;
      }
      if (!uid) return success({ roleKey: "guest", rolePageAccess: {} });

      const roleKey = await fetchRbacRoleKeyForUser(c, uid);
      const rolePageAccess = await loadRolePageAccess(c, roleKey);
      return success({ roleKey, rolePageAccess });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listMyPageOverrides(userId?: string): Promise<ServiceResult<{ page_key: string; access_level: PageAccessLevel }[]>> {
    try {
      const c = getBrowserSupabase();
      let uid = userId?.trim() || null;
      if (!uid) {
        const { data: gu } = await c.auth.getUser();
        uid = gu.user?.id ?? null;
      }
      if (!uid) return success([]);

      const map = await loadUserPageOverrides(c, uid);
      return success(
        Object.entries(map).map(([page_key, access_level]) => ({ page_key, access_level })),
      );
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
