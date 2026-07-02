"use client";

/**
 * Hook standard per liste entità: React Query + services.
 *
 * Per `filters` opzionali a forma di oggetto, passa un valore **memoizzato**
 * (`useMemo`) se i campi non cambiano ma l’identità dell’oggetto sì, altrimenti
 * la query verrà considerata diversa a ogni render.
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useMemo, useEffect, useRef } from "react";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { scheduleCompatBackgroundAudit } from "@/lib/magazzino/compat/compat-runtime-sanitize";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { semiDynamicQueryOpts } from "@/lib/react-query/data-cache-tiers";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import {
  documentiListQueryKey,
  magazzinoListQueryKey,
  mezziListQueryKey,
  movimentiListQueryKey,
  type MagazzinoListVariant,
  type MezziListVariant,
} from "@/lib/render/query-key-factory";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { documentiService, type DocumentiFilters } from "@/src/services/documenti.service";
import { logService, type LogFilters } from "@/src/services/log.service";
import { magazzinoService, type MagazzinoFilters } from "@/src/services/magazzino.service";
import { mezziService, type MezzoFilters } from "@/src/services/mezzi.service";
import { movimentiService, type MovimentiFilters } from "@/src/services/movimenti.service";
import { preventiviService, type PreventiviFilters } from "@/src/services/preventivi.service";
import { schedeService, type SchedaFilters } from "@/src/services/schede.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type {
  DocumentoRow,
  LogModificaWithProfileRow,
  MovimentoRicambioRow,
  PreventivoRow,
} from "@/src/types/supabase-tables";

type RqOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">;

export type { MezziListVariant };

export function useMezziListQuery(
  filters?: MezzoFilters,
  options?: RqOpts<MezzoGestito[]> & { variant?: MezziListVariant },
) {
  const { variant = "list", ...rqOpts } = options ?? {};
  const gestOpts = useGestionaleQueryOpts();
  const tierOpts = variant === "report" ? {} : semiDynamicQueryOpts();
  return useServiceQuery(
    mezziListQueryKey(variant, filters ?? null),
    () => (variant === "report" ? mezziService.getAllForReport(filters) : mezziService.getAll(filters)),
    { ...gestOpts, ...tierOpts, ...rqOpts },
  );
}

export type { MagazzinoListVariant };

export function useMagazzinoListQuery(
  filters?: MagazzinoFilters,
  options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]> & {
    variant?: MagazzinoListVariant;
  },
) {
  const { variant = "list", ...rqOpts } = options ?? {};
  const gestOpts = useGestionaleQueryOpts();
  const tierOpts = variant === "report" ? {} : semiDynamicQueryOpts();
  return useServiceQuery(
    magazzinoListQueryKey(variant, filters ?? null),
    () => (variant === "report" ? magazzinoService.getAllForReport(filters) : magazzinoService.getAll(filters)),
    {
      ...gestOpts,
      ...tierOpts,
      ...rqOpts,
    },
  );
}

/** Lista magazzino mappata al modello UI — unica source per componenti gestionali. */
export function useMagazzinoRicambiUIQuery(
  filters?: MagazzinoFilters,
  options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]> & {
    variant?: MagazzinoListVariant;
  },
) {
  const q = useMagazzinoListQuery(filters, options);
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload?.resolved?.mezziListe;
  const data = useMemo(
    (): RicambioMagazzino[] => mapMagazzinoRowsToUI(q.data ?? [], "Sistema", mezziListe),
    [q.data, mezziListe],
  );
  const lastAuditSigRef = useRef<string>("");
  useEffect(() => {
    if (data.length === 0) return;
    const sig = `${data.length}:${data.map((r) => r.id).join(",")}`;
    if (sig === lastAuditSigRef.current) return;
    lastAuditSigRef.current = sig;
    scheduleCompatBackgroundAudit(data, mezziListe, "useMagazzinoRicambiUIQuery");
  }, [data, mezziListe]);
  return { ...q, data };
}

export function useMovimentiListQuery(filters?: MovimentiFilters, options?: RqOpts<MovimentoRicambioRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  return useServiceQuery(movimentiListQueryKey(filters ?? null), () => movimentiService.getAll(filters), {
    ...gestOpts,
    ...options,
  });
}

export function usePreventiviListQuery(filters?: PreventiviFilters, options?: RqOpts<PreventivoRow[]>) {
  return useServiceQuery([...QK.preventivi, filters ?? null] as const, () => preventiviService.getAll(filters), options);
}

const DOCUMENTI_LIST_STALE_MS = 5 * 60_000;

export function useDocumentiListQuery(filters?: DocumentiFilters, options?: RqOpts<DocumentoRow[]>) {
  return useServiceQuery(
    documentiListQueryKey(filters ?? null),
    () => documentiService.getAll(filters),
    { staleTime: DOCUMENTI_LIST_STALE_MS, ...options },
  );
}

export function useLogListQuery(filters?: LogFilters, options?: RqOpts<LogModificaWithProfileRow[]>) {
  return useServiceQuery([...QK.log, filters ?? null] as const, () => logService.getAll(filters), options);
}

export function useSchedeListQuery(filters?: SchedaFilters) {
  return useServiceQuery([...QK.schede, filters ?? null] as const, () => schedeService.getAll(filters));
}
