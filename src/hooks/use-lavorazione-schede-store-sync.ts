"use client";

import { useSchedeStoreQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneSchedeStore } from "@/types/schede";

export const LAVORAZIONI_SCHEDE_STORE_CHANGED = "gestionale-schede-store-changed";

/** @deprecated Preferire `useSchedeStoreQuery` — mantiene API per componenti esistenti. */
export function useLavorazioneSchedeStoreSync(): LavorazioneSchedeStore {
  const { store } = useSchedeStoreQuery();
  return store;
}
