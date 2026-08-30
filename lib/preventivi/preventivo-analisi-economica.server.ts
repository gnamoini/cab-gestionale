import "server-only";

import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  PREVENTIVO_ANALISI_ECONOMICA_VERSION,
  buildPreventivoAnalisiEconomicaReport,
  type PreventivoAnalisiEconomicaApiResponse,
} from "@/lib/preventivi/preventivo-analisi-economica";
import { computePreventivoProfitto } from "@/lib/preventivi/preventivo-profitto";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import { partitionRigheRicambi } from "@/lib/preventivi/preventivi-struttura";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

async function fetchMagazzinoRowsByIdsServer(
  ids: readonly string[],
): Promise<ServiceResult<Map<string, RicambioMagazzino>>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return success(new Map());

  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return err("Permesso richiesto.");

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).in("id", unique);
  if (error) return err(error.message);

  const map = new Map<string, RicambioMagazzino>();
  for (const row of (data ?? []) as MagazzinoRicambioRow[]) {
    map.set(row.id, ricambioUiFromMagazzinoRow(row));
  }
  return success(map);
}

async function fetchLavorazioneMetaServer(lavorazioneId: string): Promise<{
  codice: string | null;
  stato: string | null;
}> {
  const trimmed = lavorazioneId.trim();
  if (!trimmed) return { codice: null, stato: null };

  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("lavorazioni")
    .select("codice, stato")
    .eq("id", trimmed)
    .maybeSingle();

  if (!data) return { codice: null, stato: null };
  const row = data as { codice?: string | null; stato?: string | null };
  return {
    codice: row.codice?.trim() || null,
    stato: row.stato?.trim() || null,
  };
}

function ricambioIdsFromRighe(righe: { ricambioId?: string | null }[]): string[] {
  const ids = new Set<string>();
  for (const r of righe) {
    const id = r.ricambioId?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

export async function loadPreventivoAnalisiEconomicaServer(
  preventivoId: string,
  generatedBy: string,
): Promise<ServiceResult<PreventivoAnalisiEconomicaApiResponse>> {
  const recordRes = await fetchPreventivoRecordServer(preventivoId);
  if (!recordRes.success || !recordRes.data) {
    return err(recordRes.error ?? "Preventivo non trovato");
  }
  const preventivo = recordRes.data;
  const lavId = preventivo.lavorazioneId?.trim() || "";

  const { standard, materialiConsumo } = partitionRigheRicambi(preventivo.righeRicambi);
  const allRighe = materialiConsumo ? [...standard, materialiConsumo] : standard;
  const ricambioIds = ricambioIdsFromRighe(allRighe);

  const [schedeRes, magazzinoRes, lavMeta] = await Promise.all([
    lavId ? fetchSchedeBundlesStoreServer([lavId]) : Promise.resolve(success({})),
    fetchMagazzinoRowsByIdsServer(ricambioIds),
    lavId ? fetchLavorazioneMetaServer(lavId) : Promise.resolve({ codice: null, stato: null }),
  ]);

  if (!magazzinoRes.success) return err(magazzinoRes.error ?? "Magazzino non disponibile");

  const bundle =
    lavId && schedeRes.success ? getOrCreateBundle(schedeRes.data ?? {}, lavId) : null;
  const profittoResult = computePreventivoProfitto({
    preventivo,
    bundle,
    magazzinoById: magazzinoRes.data ?? new Map(),
  });

  const report = buildPreventivoAnalisiEconomicaReport({
    preventivoMeta: {
      preventivo,
      lavorazioneCodice: lavMeta.codice ?? null,
      lavorazioneStato: lavMeta.stato,
    },
    profittoResult,
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatedBy.trim() || "Sistema",
      version: PREVENTIVO_ANALISI_ECONOMICA_VERSION,
    },
  });

  return success(report);
}
