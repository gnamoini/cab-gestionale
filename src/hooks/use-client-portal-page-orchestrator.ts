"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
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
import { clientPortalFiltersActive } from "@/lib/lavorazioni/client-portal-list-filters";
import { useClientPortalDataContract, type ClientPortalDataContract } from "@/src/hooks/use-client-portal-data-contract";
import { useClientPortalFiltersPersistence } from "@/src/hooks/use-client-portal-filters-persistence";
import { useGestionaleShellContentWidth } from "@/lib/ui/use-gestionale-shell-content-width";

export type ClientPortalPageOrchestrator = {
  listSurface: ListSurface;
  barrier: BarrierState;
  canRender: boolean;
  accessDenied: boolean;
  contract: ClientPortalDataContract;
  persistence: ReturnType<typeof useClientPortalFiltersPersistence>;
  archivioListEnabled: boolean;
  refresh: () => Promise<void>;
  refreshBusy: boolean;
};

export function useClientPortalPageOrchestrator(options: {
  listSurface: ListSurface;
  archivioExpanded?: boolean;
  archivioSchedeEnabled?: boolean;
}): ClientPortalPageOrchestrator {
  const access = useClientLavorazioniAccess();
  const shellContentWidth = useGestionaleShellContentWidth();
  const persistence = useClientPortalFiltersPersistence();
  const archivioListEnabled =
    options.archivioExpanded === true ||
    persistence.filters.section === "archivio" ||
    clientPortalFiltersActive(persistence.filters);
  const archivioSchedeEnabled =
    options.archivioSchedeEnabled === true ||
    options.archivioExpanded === true ||
    persistence.filters.section === "archivio" ||
    clientPortalFiltersActive(persistence.filters);
  const contract = useClientPortalDataContract(access.allowed, { archivioListEnabled, archivioSchedeEnabled });
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);

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
    listSurface: options.listSurface,
    barrier,
    canRender,
    accessDenied: !access.allowed,
    contract,
    persistence,
    archivioListEnabled,
    refresh,
    refreshBusy,
  };
}
