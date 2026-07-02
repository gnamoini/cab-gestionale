"use client";

import { ASSET_MILEAGE_READINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission, ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { auditContext, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AssetMileageReadingRow, MileageSource } from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "asset_mileage_readings";

export type MileageReadingInsert = {
  mezzo_id: string;
  km: number;
  source: MileageSource;
  recorded_at?: string;
  lavorazione_id?: string | null;
  note?: string | null;
};

async function sb() {
  return getBrowserSupabase();
}

export const assetMileageService = {
  async listByMezzo(mezzoId: string, limit = 50): Promise<ServiceResult<AssetMileageReadingRow[]>> {
    const allowed = await ensureSectionRead("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data, error } = await client
        .from("asset_mileage_readings")
        .select(ASSET_MILEAGE_READINGS_COLUMNS)
        .eq("mezzo_id", mezzoId)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetMileageReadingRow[]);
    } catch (e) {
      return serviceFailFromError<AssetMileageReadingRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async appendReading(input: MileageReadingInsert): Promise<ServiceResult<AssetMileageReadingRow>> {
    const allowed = await ensurePermission("editVehicles");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    if (!Number.isFinite(input.km) || input.km < 0) {
      return err("Chilometraggio non valido.");
    }
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const payload = {
        mezzo_id: input.mezzo_id,
        km: input.km,
        source: input.source,
        recorded_at: input.recorded_at ?? new Date().toISOString(),
        lavorazione_id: input.lavorazione_id ?? null,
        note: input.note ?? null,
        created_by: user.user?.id ?? null,
      };
      const { data: row, error } = await client
        .from("asset_mileage_readings")
        .insert(payload)
        .select(ASSET_MILEAGE_READINGS_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
      const r = row as AssetMileageReadingRow;
      await writeModificaLog(client, {
        entita: ENTITA,
        entita_id: r.id,
        azione: "CREATE",
        payload: auditSnapshot(r, auditContext(`Km ${r.km}`)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError<AssetMileageReadingRow>(e, null as never, { entity: "mezzo", action: "create" });
    }
  },
};
