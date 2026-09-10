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
import {
  applyOpenRicambioGetByIdResult,
  createOpenRicambioGetByIdGenerationGate,
} from "@/lib/magazzino/open-ricambio-get-by-id-lifecycle";
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
  const inFlightRef = useRef(false);
  const getByIdGateRef = useRef(createOpenRicambioGetByIdGenerationGate());

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
    getByIdGateRef.current.invalidate();
    inFlightRef.current = false;
    setQrOpenError(null);
    setIsResolvingOpen(false);
  }, [searchParams]);

  useEffect(() => {
    const step = planOpenRicambioDeepLinkStep({
      openId,
      consumedOpenId: consumedOpenIdRef.current,
      inFlight: inFlightRef.current,
      prodottiIds: prodotti.map((p) => p.id),
      listQuery,
      enabled,
    });

    if (step.kind === "idle" || step.kind === "wait") return;

    if (step.kind === "open_from_list") {
      completeSuccess(step.id, "list_hit");
      return;
    }

    const gate = getByIdGateRef.current;
    const attemptGen = gate.beginAttempt();
    inFlightRef.current = true;
    setIsResolvingOpen(true);

    void (async () => {
      try {
        const res = await magazzinoEntry.getById(step.id);
        applyOpenRicambioGetByIdResult({
          attemptGen,
          gate,
          ricambioId: step.id,
          res,
          listQueryIsError: listQuery.isError,
          queryClient,
          listQueryKey,
          mezziListe,
          authorName,
          onSuccess: completeSuccess,
          onFailure: completeFailure,
        });
      } catch {
        if (gate.isCurrent(attemptGen)) {
          completeFailure(step.id, "getById_error");
        }
      } finally {
        if (gate.isCurrent(attemptGen)) {
          inFlightRef.current = false;
          setIsResolvingOpen(false);
        }
      }
    })();

    return () => {
      gate.invalidate();
      inFlightRef.current = false;
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
