"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export const permissionsService = {
  /** Permessi granulari dell'utente corrente (RLS: proprie righe o admin vede tutte). */
  async listMyPermissions(): Promise<ServiceResult<UserPermissionRow[]>> {
    try {
      const c = getBrowserSupabase();
      const { data: gu } = await c.auth.getUser();
      const uid = gu.user?.id;
      if (!uid) return success([]);

      const { data, error } = await c.from("user_permissions").select("*").eq("user_id", uid);
      if (error) return err(error.message);
      return success((data ?? []) as UserPermissionRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
