"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import {
  MAGAZZINO_QR_OPEN_ERROR_MESSAGE,
  planOpenRicambioDeepLinkStep,
} from "@/lib/magazzino/open-ricambio-deeplink-phase";
import { patchMagazzinoListCache, ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { Q_OPEN_RICAMBIO, Q_OPEN_SOURCE } from "@/lib/navigation/dashboard-log-links";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyLogBoot } from "@/lib/observability/boot-investigation-lazy";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type MagazzinoDetailState = { id: string; mode: "info" | "edit" } | null;

type ListQuery = Pick<
  UseQueryResult<MagazzinoRicambioRow[], Error>,
  "data" | "isLoading" | "isFetching" | "isError" | "fetchStatus" | "status"
>;

export type UseMagazzinoOpenRicambioDeepLinkInput = {
  searchParams: ReadonlyURLSearchParams;
  router: AppRouterInstance;
  pathname: string;
  listQuery: ListQuery;
  prodotti: RicambioMagazzino[];
  queryClient: QueryClient;
  mezziListe: MezziListePrefs;
  authorName: string;
  setDetail: React.Dispatch<React.SetStateAction<MagazzinoDetailState>>;
  listQueryKey: readonly unknown[];
  enabled?: boolean;
};

function logQrOpenOutcome(outcome: string): void {
  if (!isBootInvestigationEnabled()) return;
  lazyLogBoot("REDIRECT", "MagazzinoOpenRicambioDeepLink", { outcome });
}

export function useMagazzinoOpenRicambioDeepLink(input: UseMagazzinoOpenRicambioDeepLinkInput) {
  const {
    searchParams,
    router,
    pathname,
    listQuery,
    prodotti,
    queryClient,
    mezziListe,
    authorName,
    setDetail,
    listQueryKey,
    enabled = true,
  } = input;

  const openId = searchParams.get(Q_OPEN_RICAMBIO)?.trim() || null;
  const source = searchParams.get(Q_OPEN_SOURCE)?.trim() ?? "";
  const isQrSource = source === "qr";

  const [qrOpenError, setQrOpenError] = useState<string | null>(null);
  const [isResolvingOpen, setIsResolvingOpen] = useState(false);

  const consumedOpenIdRef = useRef<string | null>(null);
  const getByIdAttemptedRef = useRef(false);
  const inFlightRef = useRef(false);

  const stripOpenRicambioParams = useCallback(() => {
    deferredRouterReplace(router, pathname, { scroll: false });
  }, [router, pathname]);

  const completeSuccess = useCallback(
    (id: string, outcome: string) => {
      consumedOpenIdRef.current = id;
      setQrOpenError(null);
      setDetail({ id, mode: "info" });
      stripOpenRicambioParams();
      logQrOpenOutcome(outcome);
    },
    [setDetail, stripOpenRicambioParams],
  );

  const completeFailure = useCallback(
    (id: string, outcome: string) => {
      consumedOpenIdRef.current = id;
      setQrOpenError(MAGAZZINO_QR_OPEN_ERROR_MESSAGE);
      stripOpenRicambioParams();
      logQrOpenOutcome(outcome);
    },
    [stripOpenRicambioParams],
  );

  const retryQrOpen = useCallback(() => {
    if (!searchParams.get(Q_OPEN_RICAMBIO)?.trim()) return;
    consumedOpenIdRef.current = null;
    getByIdAttemptedRef.current = false;
    inFlightRef.current = false;
    setQrOpenError(null);
    setIsResolvingOpen(false);
  }, [searchParams]);

  useEffect(() => {
    const step = planOpenRicambioDeepLinkStep({
      openId,
      consumedOpenId: consumedOpenIdRef.current,
      getByIdAttempted: getByIdAttemptedRef.current,
      inFlight: inFlightRef.current,
      prodottiIds: prodotti.map((p) => p.id),
      listQuery,
      enabled,
    });

    if (step.kind === "noop" || step.kind === "wait") return;

    if (step.kind === "open_from_list") {
      completeSuccess(step.id, "list_hit");
      return;
    }

    getByIdAttemptedRef.current = true;
    inFlightRef.current = true;
    setIsResolvingOpen(true);

    let cancelled = false;
    void (async () => {
      try {
        const res = await magazzinoEntry.getById(step.id);
        if (cancelled) return;
        if (!res.success || !res.data) {
          completeFailure(step.id, listQuery.isError ? "list_error_not_found" : "not_found");
          return;
        }
        const ui = ricambioUiFromMagazzinoRow(res.data, authorName, mezziListe);
        patchMagazzinoListCache(
          queryClient,
          (prev) => (prev.some((p) => p.id === ui.id) ? prev : [...prev, ui]),
          mezziListe,
          { queryKey: listQueryKey },
        );
        completeSuccess(step.id, "getById_hit");
      } catch {
        if (!cancelled) completeFailure(step.id, "getById_error");
      } finally {
        if (!cancelled) {
          inFlightRef.current = false;
          setIsResolvingOpen(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    openId,
    prodotti,
    listQuery,
    enabled,
    authorName,
    mezziListe,
    queryClient,
    listQueryKey,
    completeSuccess,
    completeFailure,
  ]);

  return {
    qrOpenError,
    isResolvingOpen: Boolean(openId && isResolvingOpen && !qrOpenError),
    isQrSource,
    retryQrOpen,
    hasOpenRicambioParam: Boolean(openId),
  };
}
