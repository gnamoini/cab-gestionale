"use client";

import { useMemo } from "react";
import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { adaptLegacyToListQueryResult } from "@/lib/lavorazioni/adapt-legacy-list-result";
import { useLavorazioniListV2 } from "@/lib/lavorazioni/use-lavorazioni-list-v2";
import type { ListQueryResult } from "@/lib/domain/list-types";
import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import { lavorazioneSchedeRowsQueryKey } from "@/lib/schede/schede-domain-query-cache";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import { fetchLavorazioniListAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { fetchLavorazioneDocumentiSlice } from "@/lib/lavorazioni/lavorazione-documenti-slice-fetch";
import { success } from "@/src/services/service-result";
import { lavorazioniService, type LavorazioneFilters, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { logService } from "@/src/services/log.service";
import { movimentiService } from "@/src/services/movimenti.service";
import { preventiviService } from "@/src/services/preventivi.service";
import { lavorazioneDocumentsService } from "@/src/services/lavorazione-documents.service";
import { schedeService } from "@/src/services/schede.service";
import type { SchedaLavorazioneRow } from "@/src/types/supabase-tables";
import {
  lavorazioniListQueryKey,
  stableLavorazioniFiltersKey,
} from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { QK } from "@/src/lib/react-query/query-keys";

export { stableLavorazioniFiltersKey };

/** Prefisso stabile per query atomi dominio lavorazioni (invalidazione globale). */
export const lavorazioniDomainQueryKeys = {
  root: QK.lavorazioniQueries,
  base: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "base", lavorazioneId] as const,
  list: lavorazioniListQueryKey,
  schede: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "schede", lavorazioneId] as const,
  movimenti: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "movimenti", lavorazioneId] as const,
  preventivi: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "preventivi", lavorazioneId] as const,
  documenti: (lavorazioneId: string, marca: string, modello: string) =>
    [...lavorazioniDomainQueryKeys.root, "documenti", lavorazioneId, marca, modello] as const,
  log: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "log", lavorazioneId] as const,
  lavorazionePdfs: (lavorazioneId: string) =>
    [...lavorazioniDomainQueryKeys.root, "lavorazionePdfs", lavorazioneId] as const,
};

const LA_STALE_MS = 30_000;

function lavIdOrEmpty(lavorazioneId: string | undefined): string {
  return lavorazioneId?.trim() ?? "";
}

type LavListQueryKey = ReturnType<typeof lavorazioniDomainQueryKeys.list>;

type LavListOpts = Omit<
  UseQueryOptions<LavorazioneListRow[], Error, LavorazioneListRow[], LavListQueryKey>,
  "queryKey" | "queryFn"
> & {
  /** Se true, filtra per `profiles.cliente_ref` (solo portale `/lavorazioni-clienti`). */
  clientPortal?: boolean;
};

export type { ListQueryResult };

/** Lista lavorazioni — facade R-10: sempre ListQueryResult; flag sceglie V2 vs legacy adapter. */
export function useLavorazioniList(
  filters?: LavorazioneFilters,
  options?: LavListOpts,
): ListQueryResult<LavorazioneListRow> {
  const v2Enabled = isServerListPaginationEnabled();
  const clientPortal = options?.clientPortal === true;
  const { clientPortal: _cp, ...queryOpts } = options ?? {};
  const enabled = queryOpts.enabled !== false;

  const legacyQuery = useLavorazioniListLegacy(filters, {
    ...queryOpts,
    clientPortal,
    enabled: !v2Enabled && enabled,
  });

  const staleMs =
    typeof queryOpts.staleTime === "number" ? queryOpts.staleTime : LA_STALE_MS;

  const v2Result = useLavorazioniListV2(filters, {
    enabled: v2Enabled && enabled,
    clientPortal,
    staleTime: staleMs,
  });

  return v2Enabled ? v2Result : adaptLegacyToListQueryResult(legacyQuery);
}

function useLavorazioniListLegacy(filters?: LavorazioneFilters, options?: LavListOpts) {
  const fk = stableLavorazioniFiltersKey(filters);
  const clientPortal = options?.clientPortal === true;
  const { clientPortal: _cp, ...queryOpts } = options ?? {};
  return useServiceQuery(
    lavorazioniDomainQueryKeys.list(fk, clientPortal),
    () => fetchLavorazioniListAuthorized(filters, { clientPortal }),
    {
      staleTime: LA_STALE_MS,
      enabled: queryOpts.enabled !== false,
      ...queryOpts,
    },
  );
}

/** Lavorazioni per mezzo (riusa la stessa chiave di lista con filtri mezzo + join). */
export function useLavorazioniByMezzo(mezzoId: string | undefined) {
  const id = lavIdOrEmpty(mezzoId);
  const filters = useMemo((): LavorazioneFilters | undefined => {
    if (!id) return undefined;
    return { mezzo_id: id, includeMezzo: true };
  }, [id]);
  return useLavorazioniList(filters, { enabled: id.length > 0, staleTime: LA_STALE_MS });
}

/** Singola lavorazione (anagrafica intervento). */
export function useLavorazioneBase(lavorazioneId: string | undefined, dedupTag?: string) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useSharedEntityQuery({
    entityType: "lavorazioni",
    entityId: id,
    scope: "detail",
    queryKey: lavorazioniDomainQueryKeys.base(id),
    queryFn: () => lavorazioniService.getById(id),
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
    dedupTag,
  });
}

/** Schede collegate alla lavorazione. */
type SchedeByLavOpts = Omit<
  UseQueryOptions<SchedaLavorazioneRow[], Error, SchedaLavorazioneRow[], ReturnType<typeof lavorazioniDomainQueryKeys.schede>>,
  "queryKey" | "queryFn"
>;

/** Schede per lavorazione — riusa righe già caricate da `ensureSchedeBundlesInCache` quando presenti. */
export function useSchedeByLavorazione(lavorazioneId: string | undefined, options?: SchedeByLavOpts) {
  const qc = useQueryClient();
  const id = lavIdOrEmpty(lavorazioneId);
  const key = lavorazioniDomainQueryKeys.schede(id);
  return useServiceQuery(
    key,
    () => {
      const cached = qc.getQueryData<SchedaLavorazioneRow[]>(lavorazioneSchedeRowsQueryKey(id));
      if (cached !== undefined) return Promise.resolve(success(cached));
      return schedeService.getAll({ lavorazione_id: id });
    },
    {
      enabled: id.length > 0,
      staleTime: LA_STALE_MS,
      ...options,
    },
  );
}

/** Movimenti magazzino per lavorazione. */
export function useMovimentiByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.movimenti(id), () => movimentiService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Preventivi collegati alla lavorazione. */
export function usePreventiviByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.preventivi(id), () => preventiviService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/**
 * Documenti archivio compatibili con marca/modello del mezzo della lavorazione.
 */
export function useDocumentiByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  const base = useLavorazioneBase(lavorazioneId);
  const mezzoId = base.data?.mezzo_id?.trim() ?? "";
  return useServiceQuery(
    lavorazioniDomainQueryKeys.documenti(id, mezzoId || "__pending__", "__pending__"),
    () => fetchLavorazioneDocumentiSlice(mezzoId),
    {
      enabled: id.length > 0 && base.isSuccess,
      staleTime: LA_STALE_MS,
    },
  );
}

/** Log modifiche entità `lavorazioni`. */
export function useLogByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(
    lavorazioniDomainQueryKeys.log(id),
    () => logService.getAll({ entita: "lavorazioni", entita_id: id, limit: LOG_MODIFICHE_RETENTION_PER_ENTITA }),
    {
      enabled: id.length > 0,
      staleTime: LA_STALE_MS,
    },
  );
}

/** PDF preventivo esterno + DDT (`lavorazione_documents`). */
export function useLavorazionePdfsByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(
    lavorazioniDomainQueryKeys.lavorazionePdfs(id),
    () => lavorazioneDocumentsService.listByLavorazione(id),
    { enabled: id.length > 0, staleTime: LA_STALE_MS },
  );
}
