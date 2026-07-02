import "server-only";

import { cache } from "react";
import { fetchDocumentiRowsServer } from "@/lib/documenti/documenti-list-fetch-server";
import { getMezziListLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getAppSettingsPayloadReadServer } from "@/lib/app-settings/app-settings-fetch-server";
import type { DocumentoRow } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoRow } from "@/src/types/supabase-tables";

export type DocumentiDashboardDTO = {
  settings: CabAppSettingsQueryPayload;
  mezzi: MezzoGestito[];
  documenti: DocumentoRow[];
};

/** BFF Documenti — settings ∥ mezzi ∥ documenti (3 query parallele, 1 wave). */
export async function fetchDocumentiDashboardDTOServer(): Promise<ServiceResult<DocumentiDashboardDTO>> {
  const [settingsRes, mezziRes, docRes] = await Promise.all([
    getAppSettingsPayloadReadServer(),
    getMezziListLightServer(),
    fetchDocumentiRowsServer(),
  ]);

  if (!settingsRes.success) return err(settingsRes.error ?? "Impostazioni non disponibili.");
  if (!mezziRes.success) return err(mezziRes.error ?? "Mezzi non disponibili.");
  if (!docRes.success) return err(docRes.error ?? "Documenti non disponibili.");

  return success({
    settings: settingsRes.data ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() },
    mezzi: mezziRes.data ?? [],
    documenti: docRes.data ?? [],
  });
}

export const getDocumentiDashboardDTOServer = cache(fetchDocumentiDashboardDTOServer);
