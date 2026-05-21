"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CAB_LAVORAZIONI_PREFS_REFRESH,
  CAB_MAGAZZINO_MASTER_REFRESH,
  CAB_MEZZI_LISTE_REFRESH,
} from "@/lib/sistema/cab-events";
import { subscribeCabSync } from "@/lib/sync/cab-sync-bus";
import { QK } from "@/src/lib/react-query/invalidate-related";

/** Collega eventi legacy prefs al refresh React Query `app_settings`. */
export function CabLegacyPrefsSyncBridge() {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: [...QK.settings] });
    };

    const onLegacy = () => invalidate();
    window.addEventListener(CAB_LAVORAZIONI_PREFS_REFRESH, onLegacy);
    window.addEventListener(CAB_MAGAZZINO_MASTER_REFRESH, onLegacy);
    window.addEventListener(CAB_MEZZI_LISTE_REFRESH, onLegacy);

    const unsub = subscribeCabSync((ev) => {
      if (ev.type === "settings_updated") invalidate();
    });

    return () => {
      window.removeEventListener(CAB_LAVORAZIONI_PREFS_REFRESH, onLegacy);
      window.removeEventListener(CAB_MAGAZZINO_MASTER_REFRESH, onLegacy);
      window.removeEventListener(CAB_MEZZI_LISTE_REFRESH, onLegacy);
      unsub();
    };
  }, [qc]);

  return null;
}
