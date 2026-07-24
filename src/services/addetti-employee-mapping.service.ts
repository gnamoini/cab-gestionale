"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { normalizeAddettoMappingKey } from "@/lib/analytics/hours/normalize-addetto-mapping-key";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { AddettiEmployeeMappingRow } from "@/src/types/supabase-tables";

const COLUMNS = "id, addetto_nome, employee_id, confirmed_at, confirmed_by, created_at, updated_at" as const;

async function sb() {
  return getBrowserSupabase();
}

export const addettiEmployeeMappingService = {
  async getAll(): Promise<ServiceResult<AddettiEmployeeMappingRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("addetti_employee_mapping").select(COLUMNS).order("addetto_nome");
      if (error) return err(error.message);
      return success((data ?? []) as AddettiEmployeeMappingRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async confirmMapping(input: {
    addettoNome: string;
    employeeId: string;
  }): Promise<ServiceResult<AddettiEmployeeMappingRow>> {
    try {
      const c = await sb();
      const nome = normalizeAddettoMappingKey(input.addettoNome);
      if (!nome) return err("Nome addetto non valido.");
      const { data, error } = await c
        .from("addetti_employee_mapping")
        .upsert(
          {
            addetto_nome: nome,
            employee_id: input.employeeId,
            confirmed_at: new Date().toISOString(),
          },
          { onConflict: "addetto_nome" },
        )
        .select(COLUMNS)
        .single();
      if (error) return err(error.message);
      return success(data as AddettiEmployeeMappingRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
