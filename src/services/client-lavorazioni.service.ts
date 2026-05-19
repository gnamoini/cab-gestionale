"use client";

import {
  buildClientPortalVisibleStatiSet,
  isClientPortalVisibleRow,
  sanitizeClientLavorazioneRow,
} from "@/lib/lavorazioni/client-portal-stati";
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

export const clientLavorazioniService = {
  async listInCorso(): Promise<ServiceResult<LavorazioneListRow[]>> {
    try {
      const allowed = await ensureClientLavorazioniAccess();
      if (!allowed.success) return err(allowed.error ?? "Accesso negato.");

      const visibleStati = buildClientPortalVisibleStatiSet(clientPortalSettingsStati());

      const sb = await getBrowserSupabase();
      let q = sb.from("lavorazioni").select("*, mezzi(*)").order("created_at", { ascending: false });
      q = q.is("data_uscita", null);
      const { data, error } = await q;
      if (error) return err(error.message);

      const raw = (data ?? []) as Array<LavorazioneRow & { mezzi?: unknown }>;
      const rows = raw
        .map((row) => {
          const { mezzi: em, ...rest } = row;
          return sanitizeClientLavorazioneRow({ ...(rest as LavorazioneRow), mezzo: embedMezzo(em) } as LavorazioneListRow);
        })
        .filter((row) => isClientPortalVisibleRow(row, visibleStati));

      return success(rows);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getDetail(lavorazioneId: string): Promise<ServiceResult<ClientLavorazioneDetail>> {
    try {
      const allowed = await ensureClientLavorazioniAccess();
      if (!allowed.success) return err(allowed.error ?? "Accesso negato.");
      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const sb = await getBrowserSupabase();
      const { data, error } = await sb.from("lavorazioni").select("*, mezzi(*)").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Lavorazione non trovata.");

      const raw = data as Record<string, unknown> & LavorazioneRow;
      const mezzo = embedMezzo(raw.mezzi);
      const { mezzi: _m, ...rest } = raw;
      const row = sanitizeClientLavorazioneRow({ ...rest, mezzo } as LavorazioneListRow);

      const logsRes = await logService.getAll({ entita: "lavorazioni", entita_id: id, limit: 200 });
      if (!logsRes.success) return err(logsRes.error ?? "Errore log.");

      return success({ row, logs: logsRes.data ?? [] });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
