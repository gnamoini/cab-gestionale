"use client";

import { useGlobalOptions } from "@/src/hooks/use-global-options";

/** Albero mezzi merged (settings + flotta) — SSOT lettura compat UI. */
export function useCompatMezziListe(debugTag = "useCompatMezziListe") {
  const { mezziListe, isLoading } = useGlobalOptions({ debugTag });
  return { mezziListe, isLoading };
}
