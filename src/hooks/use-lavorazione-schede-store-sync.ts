"use client";

import { useSchedeStoreQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";

/** @deprecated Preferire `useSchedeStoreQuery` — mantiene API per componenti esistenti. */
export function useLavorazioneSchedeStoreSync(): LavorazioneSchedeStore {
  const { store } = useSchedeStoreQuery();
  return store;
}
