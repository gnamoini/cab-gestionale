"use client";

import { useEffect, useRef } from "react";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import {
  acknowledgeClientPortalSyncSuccess,
} from "@/src/lib/react-query/sync-client-portal-operational-data";
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
  const initialSyncAcked = useRef(false);

  useEffect(() => {
    if (!access.allowed || contract.l0Status !== "success" || initialSyncAcked.current) return;
    initialSyncAcked.current = true;
    acknowledgeClientPortalSyncSuccess();
  }, [access.allowed, contract.l0Status]);

  const barrier = deriveBarrierState({
    accessAllowed: access.allowed,
    shellContentWidth,
    l0Status: contract.l0Status,
    l1Status: contract.l1Status,
    forceRefreshing: false,
  });

  const canRender = canRenderFromBarrier(barrier);

  return {
    listSurface: options.listSurface,
    barrier,
    canRender,
    accessDenied: !access.allowed,
    contract,
    persistence,
    archivioListEnabled,
  };
}
