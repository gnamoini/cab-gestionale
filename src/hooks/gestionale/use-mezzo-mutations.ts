"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import { mezziService, type MezzoInsert, type MezzoUpdate } from "@/src/services/mezzi.service";

export function useMezzoCreateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((data: MezzoInsert) => mezziService.create(data), {
    onSettled: async (data) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: data?.id ?? "list", operation: "create" },
        () => invalidateAfterMezzoMutations(queryClient, data?.id, data?.updated_at),
      );
    },
  });
}

export function useMezzoUpdateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(({ id, data }: { id: string; data: MezzoUpdate }) => mezziService.update(id, data), {
    onSettled: async (data, _error, variables) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: variables.id, operation: "update" },
        () => invalidateAfterMezzoMutations(queryClient, variables.id, data?.updated_at),
      );
    },
  });
}
