import "server-only";

import { cache } from "react";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { loadServerCallerClienteRef } from "@/src/lib/auth/cliente-portal-scope.server";
import {
  CLIENT_PORTAL_ARCHIVIO_FILTERS,
  CLIENT_PORTAL_INCORSO_FILTERS,
} from "@/lib/lavorazioni/client-portal-prefetch-filters";
import { fetchLavorazioniListRows } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import {
  buildLavorazioniSchedeCodiciMap,
  pickLavorazioniInitialSchedeIds,
} from "@/lib/lavorazioni/lavorazioni-schede-prefetch";
import { fetchSchedeBundlesStoreClientPortalServer } from "@/lib/schede/schede-bundles-fetch-server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { ServiceResult } from "@/src/services/service-result";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type ClientPortalPageDTO = {
  inCorso: LavorazioneListRow[];
  archivio: LavorazioneListRow[];
  schedeBundles: LavorazioneSchedeStore;
};

const EMPTY_DTO: ClientPortalPageDTO = { inCorso: [], archivio: [], schedeBundles: {} };

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF portale clienti: L0 parallelo + schede L1 solo inCorso (cap prefetch). */
export const fetchClientPortalPageDTOServer = cache(async (): Promise<ClientPortalPageDTO> => {
  const allowed = await verifyClientLavorazioniAccessServer();
  if (!allowed) return EMPTY_DTO;

  const sb = await createSupabaseServerUserClient();
  const clienteRefScope = await loadServerCallerClienteRef(sb);
  const fetchOpts = { clienteRefScope, clientPortal: true as const };

  const [inCorsoRes, archivioRes] = await Promise.all([
    fetchLavorazioniListRows(sb, CLIENT_PORTAL_INCORSO_FILTERS, fetchOpts),
    fetchLavorazioniListRows(sb, CLIENT_PORTAL_ARCHIVIO_FILTERS, fetchOpts),
  ]);

  const inCorso = unwrap(inCorsoRes, []);
  const archivio = unwrap(archivioRes, []);
  const schedeIds = pickLavorazioniInitialSchedeIds(inCorso);
  if (schedeIds.length === 0) {
    return { inCorso, archivio, schedeBundles: {} };
  }

  const codici = buildLavorazioniSchedeCodiciMap(inCorso, schedeIds);
  const schedeRes = await fetchSchedeBundlesStoreClientPortalServer(schedeIds, codici);
  return {
    inCorso,
    archivio,
    schedeBundles: schedeRes.success ? (schedeRes.data ?? {}) : {},
  };
});
