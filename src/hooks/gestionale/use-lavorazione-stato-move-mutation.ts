"use client";

import { useCallback, useRef } from "react";
import {
  buildLavorazioneStatoUpdatePatch,
  kanbanDndDevLog,
} from "@/lib/lavorazioni/kanban-stato-move";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";

export type UseLavorazioneStatoMoveMutationOptions = {
  statiChiusiIds: readonly string[];
  onSuccess?: (lavorazioneId: string) => void;
  onError?: (lavorazioneId: string, error: Error) => void;
};

/** Stato-only move: optimistic cache + rollback via `useLavorazioneUpdateMutation` (UI-agnostic). */
export function useLavorazioneStatoMoveMutation({
  statiChiusiIds,
  onSuccess,
  onError,
}: UseLavorazioneStatoMoveMutationOptions) {
  const updateLav = useLavorazioneUpdateMutation();
  const pendingRef = useRef(new Set<string>());

  const moveStato = useCallback(
    (lavorazioneId: string, nextStato: string): boolean => {
      if (pendingRef.current.has(lavorazioneId)) {
        kanbanDndDevLog("mutate", { skipped: "pending", lavorazioneId, nextStato });
        return false;
      }
      pendingRef.current.add(lavorazioneId);
      const data = buildLavorazioneStatoUpdatePatch(nextStato, statiChiusiIds);
      kanbanDndDevLog("mutate", { lavorazioneId, nextStato, data });
      updateLav.mutate(
        { id: lavorazioneId, data },
        {
          onSuccess: () => onSuccess?.(lavorazioneId),
          onError: (err) => {
            kanbanDndDevLog("rollback", { lavorazioneId, nextStato, error: err.message });
            onError?.(lavorazioneId, err);
          },
          onSettled: () => {
            pendingRef.current.delete(lavorazioneId);
          },
        },
      );
      return true;
    },
    [updateLav, statiChiusiIds, onSuccess, onError],
  );

  return { moveStato, isPending: updateLav.isPending };
}
