"use client";

import { useMemo } from "react";
import {
  resolveClientPortalLsdMode,
  type ClientPortalLsdMode,
} from "@/lib/lavorazioni/client-portal-lsd-policy";
import { useClientLavorazioniArchivioQuery, useClientLavorazioniInCorsoQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { L1ContractStatus, L0ContractStatus } from "./client-portal-derive-barrier";

export type ClientPortalL0Payload = {
  inCorsoRows: readonly LavorazioneListRow[];
  archivioRows: readonly LavorazioneListRow[];
  ids: string[];
  rowCount: number;
  statiOpts: ReturnType<typeof useGlobalOptions>["lavorazioni"]["stati"];
  addettiGlobali: string[];
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
};

export type ClientPortalL1Payload = {
  schedeStore: LavorazioneSchedeStore;
};

export type ClientPortalDataContract = {
  l0Status: L0ContractStatus;
  l1Status: L1ContractStatus;
  l0: ClientPortalL0Payload | null;
  l1: ClientPortalL1Payload | null;
  lsdMode: ClientPortalLsdMode;
  error: Error | null;
  inCorsoQ: ReturnType<typeof useClientLavorazioniInCorsoQuery>;
  archivioQ: ReturnType<typeof useClientLavorazioniArchivioQuery>;
  retryL0: () => Promise<void>;
};

export function useClientPortalDataContract(enabled: boolean): ClientPortalDataContract {
  const globalOpts = useGlobalOptions({ debugTag: "ClientPortalDataContract" });
  const inCorsoQ = useClientLavorazioniInCorsoQuery(enabled);
  const archivioQ = useClientLavorazioniArchivioQuery(enabled);

  const l0Loading = inCorsoQ.isLoading || archivioQ.isLoading;
  const l0Error = inCorsoQ.error ?? archivioQ.error ?? null;
  const l0HasData = inCorsoQ.data !== undefined && archivioQ.data !== undefined;

  let l0Status: L0ContractStatus = "idle";
  if (!enabled) l0Status = "idle";
  else if (l0Loading && !l0HasData) l0Status = "loading";
  else if (l0Error) l0Status = "error";
  else if (l0HasData) l0Status = "success";

  const inCorsoRows = inCorsoQ.data ?? [];
  const archivioRows = archivioQ.data ?? [];
  const ids = useMemo(
    () => [...inCorsoRows, ...archivioRows].map((r) => r.id),
    [inCorsoRows, archivioRows],
  );
  const rowCount = ids.length;
  const lsdMode = resolveClientPortalLsdMode(rowCount);

  const l0Settled = l0Status === "success";

  const { store: schedeStore, isLoading: schedeLoading } = useSchedeBundlesQuery(enabled && l0Settled, {
    viewLayer: true,
    lavorazioneIds: ids,
  });

  const l1Status: L1ContractStatus =
    !enabled || !l0Settled
      ? "idle"
      : ids.length === 0
        ? "success"
        : schedeLoading
          ? "loading"
          : "success";

  const l0: ClientPortalL0Payload | null =
    l0Status === "success"
      ? {
          inCorsoRows,
          archivioRows,
          ids,
          rowCount,
          statiOpts: globalOpts.lavorazioni.stati,
          addettiGlobali: globalOpts.lavorazioni.addetti,
          addettiRecords: globalOpts.lavorazioni.addettiRecords,
          addettoColors: globalOpts.lavorazioni.addettoColors,
        }
      : null;

  const l1: ClientPortalL1Payload | null =
    l0Settled && schedeStore ? { schedeStore } : null;

  const retryL0 = async () => {
    await Promise.all([inCorsoQ.refetch(), archivioQ.refetch()]);
  };

  return {
    l0Status,
    l1Status,
    l0,
    l1,
    lsdMode,
    error: l0Error,
    inCorsoQ,
    archivioQ,
    retryL0,
  };
}
