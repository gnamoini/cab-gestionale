import "server-only";

import { fetchLavorazioniListAuthorizedServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import type { DateRange } from "@/lib/report/date-ranges";
import { isoInRange } from "@/lib/report/date-ranges";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

function codiciMapFromLavorazioneRows(rows: readonly LavorazioneListRow[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const r of rows) out[r.id] = r.codice ?? null;
  return out;
}

export type RecidivitaInputsServer = {
  lavRows: LavorazioneListRow[];
  schedeStore: LavorazioneSchedeStore;
};

/** Batch schede per lavorazioni chiuse nel range — evita fetch archivio completo. */
export async function fetchRecidivitaInputsServer(range: DateRange): Promise<RecidivitaInputsServer> {
  const lavRes = await fetchLavorazioniListAuthorizedServer({
    fetchMode: "report",
    includeMezzo: false,
    archived: true,
  });
  const allRows = lavRes.success ? (lavRes.data ?? []) : [];
  const lavRows = allRows.filter(
    (r) =>
      !r.deleted_at &&
      r.data_uscita?.trim() &&
      isoInRange(r.data_uscita, range),
  );
  const ids = lavRows.map((r) => r.id);
  const schedeRes = ids.length
    ? await fetchSchedeBundlesStoreServer(ids, codiciMapFromLavorazioneRows(lavRows))
    : { success: true as const, data: {} as LavorazioneSchedeStore };
  return {
    lavRows,
    schedeStore: schedeRes.success ? (schedeRes.data ?? {}) : {},
  };
}
