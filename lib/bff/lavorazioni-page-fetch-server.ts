import "server-only";

import { cache } from "react";
import {
  buildLavorazioniSchedeCodiciMap,
  pickLavorazioniInitialSchedeIds,
} from "@/lib/lavorazioni/lavorazioni-schede-prefetch";
import { getLavorazioniAttiveLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getMezziListLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { ServiceResult } from "@/src/services/service-result";

export type LavorazioniPageDTO = {
  lavorazioni: LavorazioneListRow[];
  schedeBundles: LavorazioneSchedeStore;
  mezzi: MezzoGestito[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF pagina Lavorazioni: lista attive + mezzi + schede (lista ∥ mezzi, poi schede). */
export const fetchLavorazioniPageDTOServer = cache(async (): Promise<LavorazioniPageDTO> => {
  const [lavRes, mezziRes] = await Promise.all([
    getLavorazioniAttiveLightServer(),
    getMezziListLightServer(),
  ]);
  const lavorazioni = unwrap(lavRes, []);
  const mezzi = unwrap(mezziRes, []);
  const schedeIds = pickLavorazioniInitialSchedeIds(lavorazioni);
  if (schedeIds.length === 0) {
    return { lavorazioni, schedeBundles: {}, mezzi };
  }
  const codici = buildLavorazioniSchedeCodiciMap(lavorazioni, schedeIds);
  const schedeRes = await fetchSchedeBundlesStoreServer(schedeIds, codici);
  return {
    lavorazioni,
    schedeBundles: schedeRes.success ? (schedeRes.data ?? {}) : {},
    mezzi,
  };
});
