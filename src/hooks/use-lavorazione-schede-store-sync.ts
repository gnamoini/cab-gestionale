"use client";

import { useMemo } from "react";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";

/** @deprecated Preferire `useSchedeBundlesQuery` / `useSchedeBundle`. */
export function useLavorazioneSchedeStoreSync(lavorazioneId?: string): LavorazioneSchedeStore {
  const lavorazioneIds = useMemo(
    () => (lavorazioneId ? [lavorazioneId] : []),
    [lavorazioneId],
  );
  const { store } = useSchedeBundlesQuery(lavorazioneIds.length > 0, { lavorazioneIds });
  return store;
}
