"use client";

import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { fetchEnrichedLavorazioneListRow } from "@/lib/lavorazioni/fetch-enriched-lavorazione-row";
import { lavorazioneMatchesClienteScope } from "@/src/lib/auth/cliente-portal-scope";
import { loadCallerClienteRef } from "@/src/lib/auth/permission-guards";
import { fetchClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/fetch-client-effective-permissions";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

function clientPortalSettingsStati() {
  const resolved = getRuntimeCabAppSettings() ?? resolveCabAppSettingsFallback();
  return resolved.lavorazioni.stati;
}

export type ClientLavorazioneDetail = {
  row: LavorazioneListRow;
};

/** Portale clienti: sola lettura, specchio live della gestione officina. */
export const clientLavorazioniService = {
  async getDetail(lavorazioneId: string): Promise<ServiceResult<ClientLavorazioneDetail>> {
    try {
      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const sb = await getBrowserSupabase();
      const enriched = await fetchEnrichedLavorazioneListRow(sb, id);
      if (!enriched) return err("Lavorazione non trovata.");

      const settingsStati = clientPortalSettingsStati();
      const row = sanitizeClientLavorazioneRow(enriched, settingsStati);

      const snap = await fetchClientEffectivePermissionsSnapshot();
      const role = snap?.role ?? null;
      const clienteRef = await loadCallerClienteRef();
      if (
        !lavorazioneMatchesClienteScope(row, clienteRef, {
          failClosedForClienteRole: true,
          role,
        })
      ) {
        return err("Lavorazione non trovata.");
      }

      return success({ row });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
