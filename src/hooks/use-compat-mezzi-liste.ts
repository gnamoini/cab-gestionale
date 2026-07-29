"use client";

import { useGlobalOptions } from "@/src/hooks/use-global-options";

/** Albero mezzi merged (settings + flotta) + prefs settings-only per risoluzione ref. */
export function useCompatMezziListe(debugTag = "useCompatMezziListe") {
  const { mezziListe, mezziListePrefs, isLoading } = useGlobalOptions({ debugTag });
  return { mezziListe, mezziListePrefs, isLoading };
}
