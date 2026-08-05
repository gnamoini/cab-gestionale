"use client";

import { useGestionaleDirty } from "@/src/context/gestionale-dirty-context";

export const GESTIONALE_DIRTY_SEARCH_HINT =
  "I risultati potrebbero non essere aggiornati. Usa «Aggiorna pagina» per dati certi.";

export function useGestionaleDirtySearchHint(): {
  hasDirty: boolean;
  hint: string | null;
} {
  const { hasDirty } = useGestionaleDirty();
  return {
    hasDirty,
    hint: hasDirty ? GESTIONALE_DIRTY_SEARCH_HINT : null,
  };
}
