"use client";

import { PROFILES_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { ProfileRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type ProfileFilters = {
  roleKey?: string;
  search?: string;
};

/**
 * Lettura profili per dashboard sicurezza (RLS: solo security admin).
 * Creazione/modifica utenti: usare server actions in `@/src/actions/admin-users`.
 */
export const authService = {
  async getAll(filters?: ProfileFilters): Promise<ServiceResult<ProfileRow[]>> {
    try {
      const sb = getBrowserSupabase();
      let q = sb.from("profiles").select(PROFILES_COLUMNS).order("nome", { ascending: true });
      if (filters?.roleKey) q = q.eq("role_key", filters.roleKey);
      if (filters?.search?.trim()) q = q.ilike("nome", `%${filters.search.trim()}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as ProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
