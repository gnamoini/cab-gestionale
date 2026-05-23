"use client";

/**
 * Hook standard per liste entità: React Query + services.
 *
 * Per `filters` opzionali a forma di oggetto, passa un valore **memoizzato**
 * (`useMemo`) se i campi non cambiano ma l’identità dell’oggetto sì, altrimenti
 * la query verrà considerata diversa a ogni render.
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { documentiService, type DocumentiFilters } from "@/src/services/documenti.service";
import { logService, type LogFilters } from "@/src/services/log.service";
import { magazzinoService, type MagazzinoFilters } from "@/src/services/magazzino.service";
import { mezziService, type MezzoFilters } from "@/src/services/mezzi.service";
import { movimentiService, type MovimentiFilters } from "@/src/services/movimenti.service";
import { preventiviService, type PreventiviFilters } from "@/src/services/preventivi.service";
import { schedeService, type SchedaFilters } from "@/src/services/schede.service";
import type { DocumentoRow, LogModificaWithProfileRow, MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";

type RqOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">;

export function useMezziListQuery(filters?: MezzoFilters, options?: RqOpts<MezzoRow[]>) {
  return useServiceQuery([...QK.mezzi, filters ?? null] as const, () => mezziService.getAll(filters), options);
}

export function useMagazzinoListQuery(filters?: MagazzinoFilters, options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  return useServiceQuery([...QK.magazzino, filters ?? null] as const, () => magazzinoService.getAll(filters), {
    ...gestOpts,
    ...options,
  });
}

/** Lista magazzino mappata al modello UI — unica source per componenti gestionali. */
export function useMagazzinoRicambiUIQuery(filters?: MagazzinoFilters, options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]>) {
  const q = useMagazzinoListQuery(filters, options);
  const data = useMemo(
    (): RicambioMagazzino[] => (q.data ?? []).map((row) => magazzinoRowToRicambioUI(row)),
    [q.data],
  );
  return { ...q, data };
}

export function useMovimentiListQuery(filters?: MovimentiFilters) {
  const gestOpts = useGestionaleQueryOpts();
  return useServiceQuery([...QK.movimenti, filters ?? null] as const, () => movimentiService.getAll(filters), gestOpts);
}

export function usePreventiviListQuery(filters?: PreventiviFilters, options?: RqOpts<PreventivoRow[]>) {
  return useServiceQuery([...QK.preventivi, filters ?? null] as const, () => preventiviService.getAll(filters), options);
}

export function useDocumentiListQuery(filters?: DocumentiFilters, options?: RqOpts<DocumentoRow[]>) {
  return useServiceQuery([...QK.documenti, filters ?? null] as const, () => documentiService.getAll(filters), options);
}

export function useLogListQuery(filters?: LogFilters, options?: RqOpts<LogModificaWithProfileRow[]>) {
  return useServiceQuery([...QK.log, filters ?? null] as const, () => logService.getAll(filters), options);
}

export function useSchedeListQuery(filters?: SchedaFilters) {
  return useServiceQuery([...QK.schede, filters ?? null] as const, () => schedeService.getAll(filters));
}
