"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGestionaleShellContentWidth } from "@/lib/ui/use-gestionale-shell-content-width";
import {
  gestionaleListLayoutClassName,
  resolveGestionaleListContainerWidth,
  type GestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
import {
  gestionalePageLayoutSsrHint,
  resolveGestionalePageLayout,
} from "@/lib/ui/resolve-gestionale-page-layout";
import { resolveGestionaleShellViewportWidth } from "@/lib/ui/gestionale-shell-layout";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import {
  refetchActiveClientPortalMedia,
  refetchActiveSchedeBundles,
  runLavorazioniToolbarRefresh,
} from "@/src/lib/react-query/refetch-lavorazioni-operational-data";
import {
  canRenderFromBarrier,
  deriveBarrierState,
  type BarrierState,
} from "@/src/hooks/client-portal-derive-barrier";
import { useClientPortalDataContract, type ClientPortalDataContract } from "@/src/hooks/use-client-portal-data-contract";
import { useClientPortalFiltersPersistence } from "@/src/hooks/use-client-portal-filters-persistence";

export type ClientPortalPageOrchestrator = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  layout: GestionaleListLayout;
  layoutClassName: string;
  barrier: BarrierState;
  canRender: boolean;
  accessDenied: boolean;
  contract: ClientPortalDataContract;
  persistence: ReturnType<typeof useClientPortalFiltersPersistence>;
  refresh: () => Promise<void>;
  refreshBusy: boolean;
};

export function useClientPortalPageOrchestrator(options?: {
  archivioExpanded?: boolean;
  archivioSchedeEnabled?: boolean;
}): ClientPortalPageOrchestrator {
  const access = useClientLavorazioniAccess();
  const shellContentWidth = useGestionaleShellContentWidth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const syncRafRef = useRef(0);
  const persistence = useClientPortalFiltersPersistence();
  const archivioListEnabled =
    options?.archivioExpanded === true || persistence.filters.section === "archivio";
  const archivioSchedeEnabled =
    options?.archivioSchedeEnabled === true ||
    options?.archivioExpanded === true ||
    persistence.filters.section === "archivio";
  const contract = useClientPortalDataContract(access.allowed, { archivioListEnabled, archivioSchedeEnabled });
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);

  const measureContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return 0;
    return resolveGestionaleListContainerWidth(el);
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (syncRafRef.current) return;
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = 0;
      const w = measureContainer();
      setContainerWidth((prev) => (prev === w ? prev : w));
    });
  }, [measureContainer]);

  useLayoutEffect(() => {
    scheduleMeasure();
    const el = containerRef.current;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleMeasure())
        : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [scheduleMeasure]);

  const viewportWidth = typeof window !== "undefined" ? resolveGestionaleShellViewportWidth() : 0;
  const layout = resolveGestionalePageLayout({
    viewportWidth,
    containerWidth,
    shellContentWidth,
    ssrHint: gestionalePageLayoutSsrHint(shellContentWidth),
    listTier: "xl",
  });

  const barrier = deriveBarrierState({
    accessAllowed: access.allowed,
    shellContentWidth,
    l0Status: contract.l0Status,
    l1Status: contract.l1Status,
    forceRefreshing,
  });

  const canRender = canRenderFromBarrier(barrier);

  const refresh = useCallback(async () => {
    setForceRefreshing(true);
    setRefreshBusy(true);
    try {
      await runLavorazioniToolbarRefresh([
        contract.inCorsoQ.refetch(),
        contract.archivioQ.refetch(),
        refetchActiveSchedeBundles(qc),
        refetchActiveClientPortalMedia(qc),
      ]);
      gestToast.successOnce("client-lav-refresh", GESTIONALE_TOAST.successRefreshed);
    } catch (e) {
      gestToast.errorOnce("client-lav-refresh", e, { module: "lavorazioni" });
    } finally {
      setForceRefreshing(false);
      setRefreshBusy(false);
    }
  }, [contract.archivioQ, contract.inCorsoQ, gestToast, qc]);

  return {
    containerRef,
    layout,
    layoutClassName: gestionaleListLayoutClassName(layout),
    barrier,
    canRender,
    accessDenied: !access.allowed,
    contract,
    persistence,
    refresh,
    refreshBusy,
  };
}
