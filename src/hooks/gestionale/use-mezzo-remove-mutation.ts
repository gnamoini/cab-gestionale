"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import { mezziEntry } from "@/lib/domain/mezzi-entry";

/** Eliminazione mezzo con invalidazione coerente (mezzi, lavorazioni, preventivi, documenti). */
export function useMezzoRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => mezziEntry.remove(id), {
    onSettled: async (_data, _error, id) => {
      await invalidateAfterMezzoMutations(queryClient, id);
    },
  });
}
