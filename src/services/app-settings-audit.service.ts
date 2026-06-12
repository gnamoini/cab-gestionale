"use client";

import { APP_SETTINGS_AUDIT_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type AppSettingsAuditListParams = {
  module?: string;
  key?: string;
  /** Default 200. */
  limit?: number;
};

/**
 * Lettura audit `app_settings` (RLS: solo admin).
 * Le righe sono create dal trigger `trg_app_settings_audit_update` dopo UPDATE riusciti su `app_settings`.
 */
export const appSettingsAuditService = {
  async list(params: AppSettingsAuditListParams = {}): Promise<ServiceResult<AppSettingsAuditRow[]>> {
    try {
      const allowed = await ensurePermission("manageSecurity");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = getBrowserSupabase();
      const limit = Math.min(Math.max(params.limit ?? 200, 1), 2000);
      let q = c
        .from("app_settings_audit")
        .select(APP_SETTINGS_AUDIT_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (params.module?.trim()) q = q.eq("module", params.module.trim());
      if (params.key?.trim()) q = q.eq("key", params.key.trim());
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as AppSettingsAuditRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
