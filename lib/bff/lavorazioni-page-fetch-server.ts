import "server-only";

import { cache } from "react";
import {
  buildLavorazioniSchedeCodiciMap,
  pickLavorazioniInitialSchedeIds,
} from "@/lib/lavorazioni/lavorazioni-schede-prefetch";
import {
  getLavorazioniArchivioCountServer,
  getLavorazioniAttiveLightServer,
} from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
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
  archivioCount: number;
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/**
 * BFF pagina Lavorazioni: lista + mezzi + count in parallelo; schede al resolve lista
 * (dipende solo da IDs + codici riga — v. fetchSchedeBundlesStore).
 */
export const fetchLavorazioniPageDTOServer = cache(async (): Promise<LavorazioniPageDTO> => {
  const lavPromise = getLavorazioniAttiveLightServer();
  const mezziPromise = getMezziListLightServer();
  const archivioCountPromise = getLavorazioniArchivioCountServer();

  const lavRes = await lavPromise;
  const lavorazioni = unwrap(lavRes, []);
  const schedeIds = pickLavorazioniInitialSchedeIds(lavorazioni);
  const schedePromise =
    schedeIds.length === 0
      ? Promise.resolve({ success: true as const, data: {} as LavorazioneSchedeStore })
      : fetchSchedeBundlesStoreServer(
          schedeIds,
          buildLavorazioniSchedeCodiciMap(lavorazioni, schedeIds),
        );

  const [mezziRes, archivioCountRes, schedeRes] = await Promise.all([
    mezziPromise,
    archivioCountPromise,
    schedePromise,
  ]);

  return {
    lavorazioni,
    schedeBundles: schedeRes.success ? (schedeRes.data ?? {}) : {},
    mezzi: unwrap(mezziRes, []),
    archivioCount: unwrap(archivioCountRes, 0) ?? 0,
  };
});
