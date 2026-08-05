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
import { magazzinoEntry, type MagazzinoFilters } from "@/lib/domain/magazzino-entry";
import { documentiEntry, type DocumentiFilters } from "@/lib/domain/documenti-entry";
import { logEntry, type ActivityFeedFilters, type LogFilters } from "@/lib/domain/log-entry";
import { mezziEntry, type MezzoFilters } from "@/lib/domain/mezzi-entry";
import { movimentiEntry, type MovimentiFilters } from "@/lib/domain/movimenti-entry";
import { preventiviEntry, type PreventiviFilters } from "@/lib/domain/preventivi-entry";
import { schedeEntry, type SchedaFilters } from "@/lib/domain/schede-entry";
import {
  documentiListQueryKey,
  magazzinoListQueryKey,
  mezziListQueryKey,
  movimentiListQueryKey,
  type MagazzinoListVariant,
  type MezziListVariant,
} from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useCompatMezziListe } from "@/src/hooks/use-compat-mezzi-liste";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type {
  DocumentoRow,
  LogModificaWithProfileRow,
  MovimentoRicambioRow,
  PreventivoRow,
} from "@/src/types/supabase-tables";

type RqOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">;

export type { MezziListVariant };

const MEZZI_LIST_SCOPE = "mezzi.list" as const;
const MEZZI_REPORT_SCOPE = "mezzi.report" as const;

export function useMezziListQuery(
  filters?: MezzoFilters,
  options?: RqOpts<MezzoGestito[]> & { variant?: MezziListVariant },
) {
  const { variant = "list", ...rqOpts } = options ?? {};
  const gestOpts = useGestionaleQueryOpts();
  const tierOpts = variant === "report" ? {} : semiDynamicQueryOpts();
  const queryKey = mezziListQueryKey(variant, filters ?? null);
  return useSharedEntityQuery({
    queryKey,
    queryFn: () => (variant === "report" ? mezziEntry.getAllForReport(filters) : mezziEntry.getAll(filters)),
    entityType: "mezzi",
    scope: "list",
    ownershipScopeKey: variant === "list" ? MEZZI_LIST_SCOPE : MEZZI_REPORT_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    ...tierOpts,
    ...rqOpts,
  });
}

export type { MagazzinoListVariant };

const MAGAZZINO_LIST_SCOPE = "magazzino.list" as const;
const MAGAZZINO_REPORT_SCOPE = "magazzino.report" as const;

export function useMagazzinoListQuery(
  filters?: MagazzinoFilters,
  options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]> & {
    variant?: MagazzinoListVariant;
  },
) {
  const { variant = "list", ...rqOpts } = options ?? {};
  const gestOpts = useGestionaleQueryOpts();
  const tierOpts = variant === "report" ? {} : semiDynamicQueryOpts();
  const queryKey = magazzinoListQueryKey(variant, filters ?? null);
  return useSharedEntityQuery({
    queryKey,
    queryFn: () =>
      variant === "report" ? magazzinoEntry.getAllForReport(filters) : magazzinoEntry.getAll(filters),
    entityType: "magazzino",
    scope: "list",
    ownershipScopeKey: variant === "list" ? MAGAZZINO_LIST_SCOPE : MAGAZZINO_REPORT_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    ...tierOpts,
    ...rqOpts,
  });
}

/** Lista magazzino mappata al modello UI — unica source per componenti gestionali. */
export function useMagazzinoRicambiUIQuery(
  filters?: MagazzinoFilters,
  options?: RqOpts<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]> & {
    variant?: MagazzinoListVariant;
  },
) {
  const q = useMagazzinoListQuery(filters, options);
  const { mezziListe } = useCompatMezziListe("useMagazzinoRicambiUIQuery");
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

const MOVIMENTI_LIST_SCOPE = "movimenti.list" as const;

export function useMovimentiListQuery(filters?: MovimentiFilters, options?: RqOpts<MovimentoRicambioRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = movimentiListQueryKey(filters ?? null);
  return useSharedEntityQuery({
    queryKey,
    queryFn: () => movimentiEntry.getAll(filters),
    entityType: "movimenti",
    scope: "list",
    ownershipScopeKey: MOVIMENTI_LIST_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    ...options,
  });
}

export function usePreventiviListQuery(filters?: PreventiviFilters, options?: RqOpts<PreventivoRow[]>) {
  return useServiceQuery([...QK.preventivi, filters ?? null] as const, () => preventiviEntry.getAll(filters), options);
}

const DOCUMENTI_LIST_STALE_MS = 5 * 60_000;
const DOCUMENTI_LIST_SCOPE = "documenti.list" as const;

export function useDocumentiListQuery(filters?: DocumentiFilters, options?: RqOpts<DocumentoRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = documentiListQueryKey(filters ?? null);
  return useSharedEntityQuery({
    queryKey,
    queryFn: () => documentiEntry.getAll(filters),
    entityType: "documenti",
    scope: "list",
    ownershipScopeKey: DOCUMENTI_LIST_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    staleTime: DOCUMENTI_LIST_STALE_MS,
    ...options,
  });
}

export function useLogListQuery(filters?: LogFilters, options?: RqOpts<LogModificaWithProfileRow[]>) {
  return useServiceQuery([...QK.log, filters ?? null] as const, () => logEntry.getAll(filters), options);
}

/** ACTIVITY_FEED dashboard — RPC get_activity_feed centralizzata. */
export function useActivityFeedQuery(
  filters?: ActivityFeedFilters,
  options?: RqOpts<LogModificaWithProfileRow[]>,
) {
  return useServiceQuery(
    [...QK.log, "activity-feed", filters ?? null] as const,
    () => logEntry.fetchActivityFeed(filters),
    options,
  );
}

export function useSchedeListQuery(filters?: SchedaFilters) {
  return useServiceQuery([...QK.schede, filters ?? null] as const, () => schedeEntry.getAll(filters));
}
