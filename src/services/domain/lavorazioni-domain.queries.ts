"use client";

import { useMemo } from "react";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { fetchLavorazioniListAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { documentiService } from "@/src/services/documenti.service";
import { mezziService } from "@/src/services/mezzi.service";
import { err, success } from "@/src/services/service-result";
import { lavorazioniService, type LavorazioneFilters, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { logService } from "@/src/services/log.service";
import { movimentiService } from "@/src/services/movimenti.service";
import { preventiviService } from "@/src/services/preventivi.service";
import { lavorazioneDocumentsService } from "@/src/services/lavorazione-documents.service";
import { schedeService } from "@/src/services/schede.service";

/** Prefisso stabile per query atomi dominio lavorazioni (invalidazione globale). */
export const lavorazioniDomainQueryKeys = {
  root: ["lavorazioniQueries"] as const,
  base: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "base", lavorazioneId] as const,
  list: (filtersKey: string) => [...lavorazioniDomainQueryKeys.root, "list", filtersKey] as const,
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

export function stableLavorazioniFiltersKey(filters: LavorazioneFilters | undefined): string {
  if (filters == null) return "__all__";
  return JSON.stringify({
    m: filters.mezzo_id ?? "",
    s: filters.stato ?? "",
    p: filters.priorita ?? "",
    i: filters.includeMezzo ? 1 : 0,
    si: [...(filters.stati_in ?? [])].sort().join("|"),
    q: (filters.search ?? "").trim(),
    di0: (filters.data_ingresso_da ?? "").trim(),
    di1: (filters.data_ingresso_a ?? "").trim(),
    du0: (filters.data_uscita_da ?? "").trim(),
    du1: (filters.data_uscita_a ?? "").trim(),
    ar: filters.archived === true ? 1 : filters.archived === false ? 0 : -1,
  });
}

type LavListOpts = Omit<
  UseQueryOptions<LavorazioneListRow[], Error, LavorazioneListRow[], ReturnType<typeof lavorazioniDomainQueryKeys.list>>,
  "queryKey" | "queryFn"
>;

/** Lista lavorazioni con filtri opzionali (chiave cache derivata da `stableLavorazioniFiltersKey`). */
export function useLavorazioniList(filters?: LavorazioneFilters, options?: LavListOpts) {
  const fk = stableLavorazioniFiltersKey(filters);
  return useServiceQuery(lavorazioniDomainQueryKeys.list(fk), () => fetchLavorazioniListAuthorized(filters), {
    staleTime: LA_STALE_MS,
    enabled: options?.enabled !== false,
    ...options,
  });
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
export function useLavorazioneBase(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.base(id), () => lavorazioniService.getById(id), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Schede collegate alla lavorazione. */
export function useSchedeByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.schede(id), () => schedeService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
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
    async () => {
      if (!mezzoId) return success([]);
      const mezzoRes = await mezziService.getById(mezzoId);
      if (!mezzoRes.success || !mezzoRes.data) return err(mezzoRes.error ?? "Mezzo non trovato");
      const mezzoG = toMezzoUI(mezzoRes.data);
      const marca = mezzoG.marca.trim();
      if (!marca) return success([]);
      const res = await documentiService.getAll({ marca });
      if (!res.success) return res;
      const filtered = (res.data ?? []).filter((row) =>
        documentoMatchesMarcaModello(documentoRowToGestionale(row), mezzoG.marca, mezzoG.modello),
      );
      return success(filtered);
    },
    {
      enabled: id.length > 0 && base.isSuccess,
      staleTime: LA_STALE_MS,
    },
  );
}

/** Log modifiche entità `lavorazioni`. */
export function useLogByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.log(id), () => logService.getAll({ entita: "lavorazioni", entita_id: id, limit: 200 }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
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
