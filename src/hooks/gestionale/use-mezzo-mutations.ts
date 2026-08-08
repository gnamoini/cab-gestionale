"use client";

import { useQueryClient } from "@tanstack/react-query";
import { logMezzoMutationSaveTrace } from "@/lib/observability/mezzo-mutation-save-trace";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { settleMezzoMutationCache } from "@/lib/sync/settle-mezzo-mutation-cache";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
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
    onMutate: () => {
      logMezzoMutationSaveTrace("MEZZO_MUTATION_START", { operation: "create" });
    },
    onSuccess: (data) => {
      logMezzoMutationSaveTrace("MEZZO_MUTATION_REQUEST_DONE", {
        operation: "create",
        mezzoId: data?.id,
      });
    },
    onSettled: async (data) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: data?.id ?? "list", operation: "create" },
        () =>
          settleMezzoMutationCache(queryClient, {
            operation: "create",
            mezzoId: data?.id,
            dbVersion: data?.updated_at,
          }),
      );
    },
  });
}

export function useMezzoUpdateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(({ id, data }: { id: string; data: MezzoUpdate }) => mezziEntry.update(id, data), {
    onMutate: () => {
      logMezzoMutationSaveTrace("MEZZO_MUTATION_START", { operation: "update" });
    },
    onSuccess: (data, variables) => {
      logMezzoMutationSaveTrace("MEZZO_MUTATION_REQUEST_DONE", {
        operation: "update",
        mezzoId: variables.id,
      });
    },
    onSettled: async (data, _error, variables) => {
      await traceMutationLifecycle(
        { entityType: "mezzo", entityId: variables.id, operation: "update" },
        () =>
          settleMezzoMutationCache(queryClient, {
            operation: "update",
            mezzoId: variables.id,
            dbVersion: data?.updated_at,
          }),
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
        logMezzoMutationSaveTrace("MEZZO_MUTATION_START", { operation: "setTagliandi" });
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
        logMezzoMutationSaveTrace("MEZZO_MUTATION_REQUEST_DONE", {
          operation: "setTagliandi",
          mezzoId: variables.id,
        });
        if (row) patchMezzoTagliandiFromRow(queryClient, row);
        else patchMezzoTagliandiInListCaches(queryClient, variables.id, variables.enabled);
      },
      onSettled: async (data, _error, variables) => {
        await traceMutationLifecycle(
          { entityType: "mezzo", entityId: variables.id, operation: "setTagliandi" },
          () =>
            settleMezzoMutationCache(queryClient, {
              operation: "setTagliandi",
              mezzoId: variables.id,
              dbVersion: data?.updated_at,
            }),
        );
      },
    },
  );
}
