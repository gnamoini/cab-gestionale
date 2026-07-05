"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import {
  loadRolePageAccess,
  loadUserPageOverrides,
} from "@/src/lib/rbac/load-rbac-data";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export const permissionsService = {
  async listMyRolePageAccess(userId?: string): Promise<ServiceResult<Record<string, PageAccessLevel>>> {
    try {
      const c = getBrowserSupabase();
      let uid = userId?.trim() || null;
      if (!uid) {
        const { data: gu } = await c.auth.getUser();
        uid = gu.user?.id ?? null;
      }
      if (!uid) return success({});

      const { data: prof } = await c.from("profiles").select("role_key").eq("id", uid).maybeSingle();
      const roleKey = prof?.role_key ?? "guest";
      const map = await loadRolePageAccess(c, roleKey);
      return success(map);
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
