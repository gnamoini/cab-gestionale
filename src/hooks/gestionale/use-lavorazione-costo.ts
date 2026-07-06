"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { computeLavorazioneCosto, type LavorazioneCostoBreakdown } from "@/lib/lavorazioni/lavorazione-costo";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { magazzinoListQueryKey } from "@/lib/render/query-key-factory";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const MAG_LIST_KEY = magazzinoListQueryKey("list", null);

export function useLavorazioneCosto(
  lavorazioneId: string,
  bundle: LavorazioneSchedeBundle | null | undefined,
  opts: { enabled: boolean; cliente?: string },
): LavorazioneCostoBreakdown | null {
  const id = lavorazioneId.trim();
  const enabled = opts.enabled && id.length > 0 && Boolean(bundle);

  const queryClient = useQueryClient();
  const cachedMagazzino = queryClient.getQueryData<MagazzinoRicambioRow[]>(MAG_LIST_KEY);

  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const magQ = useServiceQuery(MAG_LIST_KEY, () => magazzinoEntry.getAll(), {
    enabled: enabled && cachedMagazzino == null,
    staleTime: 30_000,
    dedupTag: "lavorazione-costo",
    dedupMeta: { entityType: "magazzino", scope: "list" },
    initialData: cachedMagazzino,
    refetchOnMount: cachedMagazzino != null ? false : undefined,
  });
  const [schedeTick, setSchedeTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const bump = () => setSchedeTick((t) => t + 1);
    window.addEventListener(LAVORAZIONI_SCHEDE_STORE_CHANGED, bump);
    return () => window.removeEventListener(LAVORAZIONI_SCHEDE_STORE_CHANGED, bump);
  }, [enabled]);

  const magazzinoById = useMemo(() => {
    const map = new Map<string, MagazzinoRicambioRow>();
    const rows = magQ.data ?? cachedMagazzino ?? [];
    for (const row of rows) map.set(row.id, row);
    return map;
  }, [magQ.data, cachedMagazzino]);

  return useMemo(() => {
    void schedeTick;
    if (!enabled || !bundle) return null;

    const defaultOrario = settingsQ.data?.resolved?.preventiviDefaults?.costoOrarioDefault;
    const costoOrario = typeof defaultOrario === "number" && defaultOrario > 0 ? defaultOrario : 48;

    return computeLavorazioneCosto({
      bundle,
      costoOrario,
      magazzinoById,
    });
  }, [enabled, bundle, schedeTick, settingsQ.data, magazzinoById]);
}
