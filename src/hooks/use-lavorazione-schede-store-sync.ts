"use client";

import { useEffect, useState } from "react";
import {
  LAVORAZIONI_SCHEDE_STORAGE_KEY,
  loadLavorazioneSchedeStore,
} from "@/lib/schede/lavorazioni-schede-storage";
import type { LavorazioneSchedeStore } from "@/types/schede";

export const LAVORAZIONI_SCHEDE_STORE_CHANGED = "gestionale-schede-store-changed";

export function useLavorazioneSchedeStoreSync(): LavorazioneSchedeStore {
  const [store, setStore] = useState<LavorazioneSchedeStore>(() =>
    typeof window === "undefined" ? {} : loadLavorazioneSchedeStore(),
  );

  useEffect(() => {
    const reload = () => setStore(loadLavorazioneSchedeStore());

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAVORAZIONI_SCHEDE_STORAGE_KEY) reload();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LAVORAZIONI_SCHEDE_STORE_CHANGED, reload);
    window.addEventListener("focus", reload);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LAVORAZIONI_SCHEDE_STORE_CHANGED, reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  return store;
}
