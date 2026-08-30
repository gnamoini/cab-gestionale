"use client";

import { useMemo } from "react";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { documentiService } from "@/src/services/documenti.service";
import { err, success } from "@/src/services/service-result";
import {
  lavorazioniDomainQueryKeys,
  stableLavorazioniFiltersKey,
} from "@/src/services/domain/lavorazioni-domain.queries";
import { lavorazioniService, type LavorazioneFilters } from "@/src/services/lavorazioni.service";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { logService } from "@/src/services/log.service";
import { mezziService } from "@/src/services/mezzi.service";
import { movimentiService } from "@/src/services/movimenti.service";
import { preventiviService } from "@/src/services/preventivi.service";

/** Prefisso stabile per tutte le query atomi dominio mezzo (invalidazione globale). */
export const mezzoDomainQueryKeys = {
  root: ["mezzoQueries"] as const,
  base: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "base", mezzoId] as const,
  preventivi: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "preventivi", mezzoId] as const,
  documenti: (mezzoId: string, marca: string) => [...mezzoDomainQueryKeys.root, "documenti", mezzoId, marca] as const,
  log: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "log", mezzoId] as const,
  anagraficaHistory: (mezzoId: string, limit = 20) =>
    [...mezzoDomainQueryKeys.root, "anagraficaHistory", mezzoId, limit] as const,
  movimenti: (mezzoId: string, lavorazioneIdsKey: string) =>
    [...mezzoDomainQueryKeys.root, "movimenti", mezzoId, lavorazioneIdsKey] as const,
};

const MEZZO_ATOMIC_STALE_MS = 30_000;

function mezzoIdOrEmpty(mezzoId: string | undefined): string {
  return mezzoId?.trim() ?? "";
}

/** Riga mezzo (anagrafica V2 con attrezzatura joinata). */
export function useMezzoBase(mezzoId: string | undefined, dedupTag?: string) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useSharedEntityQuery({
    entityType: "mezzi",
    entityId: id,
    scope: "detail",
    queryKey: mezzoDomainQueryKeys.base(id),
    queryFn: () => mezziService.getGestitoById(id),
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
    dedupTag,
  });
}

/** Lavorazioni del mezzo: stessa cache di `useLavorazioniList` / `useLavorazioniByMezzo` (`lavorazioniQueries`). */
export function useMezzoLavorazioni(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  const filters = useMemo((): LavorazioneFilters | undefined => (id ? { mezzo_id: id, includeMezzo: true } : undefined), [id]);
  const fk = stableLavorazioniFiltersKey(filters);
  return useServiceQuery(lavorazioniDomainQueryKeys.list(fk, false), () => lavorazioniService.getAll(filters!), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Preventivi collegati al mezzo. */
export function useMezzoPreventivi(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(mezzoDomainQueryKeys.preventivi(id), () => preventiviService.getAll({ mezzo_id: id }), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Documenti compatibili con marca/modello del mezzo (non per singola targa/matricola). */
export function useMezzoDocumenti(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  const base = useMezzoBase(mezzoId);
  const marca = base.data?.marca?.trim() ?? "";
  return useServiceQuery(
    mezzoDomainQueryKeys.documenti(id, marca || "__pending__"),
    async () => {
      if (!base.data) return err("Mezzo non trovato");
      const mezzoG = base.data;
      const res = await documentiService.getAll({ marca: mezzoG.marca });
      if (!res.success) return res;
      const filtered = (res.data ?? []).filter((row) =>
        documentoMatchesMarcaModello(documentoRowToGestionale(row), mezzoG.marca, mezzoG.modello),
      );
      return success(filtered);
    },
    {
      enabled: id.length > 0 && base.isSuccess && marca.length > 0,
      staleTime: MEZZO_ATOMIC_STALE_MS,
    },
  );
}

/** Log modifiche anagrafica (`entita = mezzi`). */
export function useMezzoLog(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(
    mezzoDomainQueryKeys.log(id),
    () => logService.getAll({ entita: "mezzi", entita_id: id, limit: LOG_MODIFICHE_RETENTION_PER_ENTITA }),
    {
      enabled: id.length > 0,
      staleTime: MEZZO_ATOMIC_STALE_MS,
    },
  );
}

/** Movimenti ricambi per tutte le lavorazioni del mezzo — 1 query via join `lavorazioni.mezzo_id`. */
export function useMezzoMovimenti(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(
    mezzoDomainQueryKeys.movimenti(id, "__by_mezzo__"),
    () => movimentiService.getAll({ mezzo_id: id }),
    {
      enabled: id.length > 0,
      staleTime: MEZZO_ATOMIC_STALE_MS,
    },
  );
}
