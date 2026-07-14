"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import {
  patchMezzoTagliandiFromRow,
  patchMezzoTagliandiInListCaches,
  restoreMezziListCaches,
  snapshotMezziListCaches,
  type MezziListCacheSnapshot,
} from "@/src/lib/react-query/mezzi-tagliandi-optimistic";
import { QK } from "@/src/lib/react-query/query-keys";
import { mezziEntry, type MezzoInsert, type MezzoUpdate } from "@/lib/domain/mezzi-entry";

export function useMezzoCreateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((data: MezzoInsert) => mezziEntry.create(data), {
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
  return useServiceMutation(({ id, data }: { id: string; data: MezzoUpdate }) => mezziEntry.update(id, data), {
    onSettled: async (data, _error, variables) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: variables.id, operation: "update" },
        () => invalidateAfterMezzoMutations(queryClient, variables.id, data?.updated_at),
      );
    },
  });
}

export function useMezzoSetTagliandiMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(
    ({ id, enabled }: { id: string; enabled: boolean }) => mezziEntry.setTagliandiEnabled(id, enabled),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: QK.mezzi });
        const snapshot = snapshotMezziListCaches(queryClient);
        patchMezzoTagliandiInListCaches(queryClient, variables.id, variables.enabled);
        return { snapshot };
      },
      onError: (_error, _variables, context) => {
        const snap = (context as { snapshot?: MezziListCacheSnapshot } | undefined)?.snapshot;
        if (snap) restoreMezziListCaches(queryClient, snap);
      },
      onSuccess: (row, variables) => {
        if (row) patchMezzoTagliandiFromRow(queryClient, row);
        else patchMezzoTagliandiInListCaches(queryClient, variables.id, variables.enabled);
      },
      onSettled: async (data, _error, variables) => {
        await traceMutationLifecycle(
          { entityType: "mezzo", entityId: variables.id, operation: "update" },
          () => invalidateAfterMezzoMutations(queryClient, variables.id, data?.updated_at),
        );
      },
    },
  );
}
