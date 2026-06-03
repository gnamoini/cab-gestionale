"use client";

import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";

/** @deprecated Preferire `useSchedeBundlesQuery`. */
export function useLavorazioneSchedeStoreSync(): LavorazioneSchedeStore {
  const { store } = useSchedeBundlesQuery();
  return store;
}
