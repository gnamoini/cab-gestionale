"use client";

import { useEffect, useMemo, useState } from "react";
import { computeLavorazioneCosto, type LavorazioneCostoBreakdown } from "@/lib/lavorazioni/lavorazione-costo";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { magazzinoService } from "@/src/services/magazzino.service";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export function useLavorazioneCosto(
  lavorazioneId: string,
  bundle: LavorazioneSchedeBundle | null | undefined,
  opts: { enabled: boolean; cliente?: string },
): LavorazioneCostoBreakdown | null {
  const id = lavorazioneId.trim();
  const enabled = opts.enabled && id.length > 0 && Boolean(bundle);

  const settingsQ = useCabAppSettingsPayloadQuery();
  const magQ = useServiceQuery([...QK.magazzino, null] as const, () => magazzinoService.getAll(), {
    enabled,
    staleTime: 30_000,
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
    for (const row of magQ.data ?? []) map.set(row.id, row);
    return map;
  }, [magQ.data]);

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
