"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { ProfileRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type ProfileFilters = {
  ruolo?: ProfileRow["ruolo"];
  search?: string;
};

/**
 * Lettura profili per dashboard sicurezza (RLS: solo security admin).
 * Creazione/modifica utenti: usare server actions in `@/src/actions/admin-users`.
 */
export const authService = {
  async getAll(filters?: ProfileFilters): Promise<ServiceResult<ProfileRow[]>> {
    try {
      const allowed = await ensurePermission("manageUsers");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = getBrowserSupabase();
      let q = sb.from("profiles").select("*").order("nome", { ascending: true });
      if (filters?.ruolo) q = q.eq("ruolo", filters.ruolo);
      if (filters?.search?.trim()) q = q.ilike("nome", `%${filters.search.trim()}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as ProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
