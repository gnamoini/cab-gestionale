"use client";

import { useQueryClient } from "@tanstack/react-query";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { settleMezzoMutationCache } from "@/lib/sync/settle-mezzo-mutation-cache";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { mezziEntry } from "@/lib/domain/mezzi-entry";

/** Eliminazione mezzo con invalidazione coerente (mezzi, lavorazioni, preventivi, documenti). */
export function useMezzoRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => mezziEntry.remove(id), {
    onSettled: async (_data, _error, id) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: id, operation: "remove" },
        () =>
          settleMezzoMutationCache(queryClient, {
            operation: "remove",
            mezzoId: id,
          }),
      );
    },
  });
}
