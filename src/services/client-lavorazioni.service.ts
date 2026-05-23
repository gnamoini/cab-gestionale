"use client";

import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { ensureClientLavorazioniAccess } from "@/src/lib/auth/permission-guards";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { logService } from "@/src/services/log.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LogModificaRow, LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

function embedMezzo(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as MezzoRow) ?? null;
  return raw as MezzoRow;
}

function clientPortalSettingsStati() {
  const resolved = getRuntimeCabAppSettings() ?? resolveCabAppSettingsFallback();
  return resolved.lavorazioni.stati;
}

export type ClientLavorazioneDetail = {
  row: LavorazioneListRow;
  logs: LogModificaRow[];
};

/** Portale clienti: sola lettura, specchio live della gestione officina. */
export const clientLavorazioniService = {
  async getDetail(lavorazioneId: string): Promise<ServiceResult<ClientLavorazioneDetail>> {
    try {
      const allowed = await ensureClientLavorazioniAccess();
      if (!allowed.success) return err(allowed.error ?? "Accesso negato.");
      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const sb = await getBrowserSupabase();
      const { data, error } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*, mezzi(*)").eq("id", id)).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Lavorazione non trovata.");

      const raw = data as Record<string, unknown> & LavorazioneRow & { archived?: boolean };
      const mezzo = embedMezzo(raw.mezzi);
      const { mezzi: _m, ...rest } = raw;
      const settingsStati = clientPortalSettingsStati();
      const row = sanitizeClientLavorazioneRow(
        { ...rest, archived: rest.archived === true, mezzo } as LavorazioneListRow,
        settingsStati,
      );

      const logsRes = await logService.getAll({ entita: "lavorazioni", entita_id: id, limit: 200 });
      if (!logsRes.success) return err(logsRes.error ?? "Errore log.");

      return success({ row, logs: logsRes.data ?? [] });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
