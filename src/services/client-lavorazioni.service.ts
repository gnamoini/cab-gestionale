"use client";

import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
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

function completionSortKey(row: LavorazioneListRow): string {
  return row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at || row.created_at || "";
}

function ingressoSortKey(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at || "";
}

function mapListRows(
  raw: Array<LavorazioneRow & { mezzi?: unknown; archived?: boolean }>,
  settingsStati: ReturnType<typeof clientPortalSettingsStati>,
): LavorazioneListRow[] {
  return raw.map((row) => {
    const { mezzi: em, ...rest } = row;
    return sanitizeClientLavorazioneRow(
      {
        ...(rest as LavorazioneRow),
        archived: rest.archived === true,
        mezzo: embedMezzo(em),
      } as LavorazioneListRow,
      settingsStati,
    );
  });
}

/** Stesse regole della pagina Lavorazioni principale: solo `archived`, nessun filtro su stato. */
async function fetchLavorazioniByArchived(archived: boolean): Promise<ServiceResult<LavorazioneListRow[]>> {
  const sb = await getBrowserSupabase();
  const { data, error } = await sb
    .from("lavorazioni")
    .select("*, mezzi(*)")
    .eq("archived", archived)
    .order("created_at", { ascending: false });
  if (error) return err(error.message);
  const settingsStati = clientPortalSettingsStati();
  const raw = (data ?? []) as Array<LavorazioneRow & { mezzi?: unknown; archived?: boolean }>;
  return success(mapListRows(raw, settingsStati));
}

export type ClientLavorazioniListPayload = {
  inCorso: LavorazioneListRow[];
  archivio: LavorazioneListRow[];
};

export type ClientLavorazioneDetail = {
  row: LavorazioneListRow;
  logs: LogModificaRow[];
};

/** Portale clienti: sola lettura, specchio live della gestione officina. */
export const clientLavorazioniService = {
  async list(): Promise<ServiceResult<ClientLavorazioniListPayload>> {
    try {
      const allowed = await ensureClientLavorazioniAccess();
      if (!allowed.success) return err(allowed.error ?? "Accesso negato.");

      const [inCorsoRes, archivioRes] = await Promise.all([
        fetchLavorazioniByArchived(false),
        fetchLavorazioniByArchived(true),
      ]);
      if (!inCorsoRes.success) return err(inCorsoRes.error ?? "Errore caricamento lavorazioni in corso.");
      if (!archivioRes.success) return err(archivioRes.error ?? "Errore caricamento archivio.");

      const inCorso = [...inCorsoRes.data!].sort((a, b) => ingressoSortKey(b).localeCompare(ingressoSortKey(a)));
      const archivio = [...archivioRes.data!].sort((a, b) => completionSortKey(b).localeCompare(completionSortKey(a)));

      return success({ inCorso, archivio });
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
