"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { cabSyncEventForEntity, invalidateAfterLavorazioneMutations } from "@/src/lib/react-query/invalidate-related";
import {
  applyOptimisticLavorazioneUpdate,
  buildCompletamentoOptimisticPatch,
  buildConcludeOptimisticPatch,
  buildLavorazioneOptimisticAudit,
  buildRestoreOptimisticPatch,
  lavorazioniListCacheRows,
  rollbackLavorazioneUpdateQueries,
  settleLavorazioneQuickUpdate,
  snapshotLavorazioneUpdateQueries,
  type LavorazioneUpdateOptimisticContext,
} from "@/src/lib/react-query/lavorazioni-optimistic";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import { evictLavorazioneDomainCache } from "@/src/lib/react-query/evict-lavorazione-domain-cache";
import { lavorazioniEntry } from "@/lib/domain/lavorazioni-entry";
import type {
  LavorazioneInsert,
  LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { UseMutationResult } from "@tanstack/react-query";

export type UseLavorazioneMutationDeferOptions = {
  /** Orchestrazione multi-stage: invalidazione MIC solo a fine transazione (create/edit ingresso). */
  deferInvalidation?: boolean;
};

export type UseLavorazioneCreateMutationOptions = UseLavorazioneMutationDeferOptions;

export function useLavorazioneCreateMutation(options?: UseLavorazioneCreateMutationOptions) {
  const deferInvalidation = options?.deferInvalidation ?? false;
  const queryClient = useQueryClient();
  return useServiceMutation((data: LavorazioneInsert) => lavorazioniEntry.create(data), {
    onSettled: async (data, error) => {
      if (error || deferInvalidation) return;
      const cabSyncEvents =
        data?.id != null
          ? [cabSyncEventForEntity("lavorazioni", data.id, "entity_created", "lavorazioni")]
          : undefined;
      await traceMutationLifecycle(
        { entityType: "lavorazione", entityId: data?.id ?? "list", operation: "create" },
        () => invalidateAfterLavorazioneMutations(queryClient, cabSyncEvents, data?.id, data?.updated_at),
      );
    },
  });
}

export type UseLavorazioneUpdateMutationOptions = UseLavorazioneMutationDeferOptions;

export function useLavorazioneUpdateMutation(options?: UseLavorazioneUpdateMutationOptions) {
  const deferInvalidation = options?.deferInvalidation ?? false;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const optimisticAudit = buildLavorazioneOptimisticAudit(user?.id);
  return useServiceMutation(
    ({ id, data }: { id: string; data: LavorazioneUpdate }) => lavorazioniEntry.update(id, data),
    {
      onMutate: async (variables) => {
        const context = await snapshotLavorazioneUpdateQueries(queryClient, variables.id);
        applyOptimisticLavorazioneUpdate(queryClient, variables.id, variables.data, undefined, optimisticAudit);
        return context;
      },
      onSuccess: (serverRow, variables) => {
        applyOptimisticLavorazioneUpdate(queryClient, variables.id, variables.data, serverRow);
        markRecentLocalGestionaleMutation(["lavorazioni"], variables.id);
      },
      onError: (_err, _variables, context) => {
        if (context) rollbackLavorazioneUpdateQueries(queryClient, context as LavorazioneUpdateOptimisticContext);
      },
      onSettled: async (data, error, variables) => {
        if (error || deferInvalidation) return;
        await traceMutationLifecycle(
          { entityType: "lavorazione", entityId: variables.id, operation: "update" },
          () => settleLavorazioneQuickUpdate(queryClient, false, variables.id, data?.updated_at),
        );
      },
    },
  );
}

export function useLavorazioneUpdateCompletamentoMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const optimisticAudit = buildLavorazioneOptimisticAudit(user?.id);
  return useServiceMutation(
    ({ id, completionYmd }: { id: string; completionYmd: string }) =>
      lavorazioniEntry.updateArchivioCompletamento(id, completionYmd),
    {
      onMutate: async ({ id, completionYmd }) => {
        const context = await snapshotLavorazioneUpdateQueries(queryClient, id);
        applyOptimisticLavorazioneUpdate(
          queryClient,
          id,
          buildCompletamentoOptimisticPatch(completionYmd),
          undefined,
          optimisticAudit,
        );
        return context;
      },
      onSuccess: (serverRow, { id }) => {
        applyOptimisticLavorazioneUpdate(queryClient, id, {}, serverRow);
        markRecentLocalGestionaleMutation(["lavorazioni"], id);
      },
      onError: (_err, _variables, context) => {
        if (context) rollbackLavorazioneUpdateQueries(queryClient, context as LavorazioneUpdateOptimisticContext);
      },
      onSettled: async (data, error, variables) => {
        if (error) return;
        await traceMutationLifecycle(
          { entityType: "lavorazione", entityId: variables.id, operation: "update" },
          () => settleLavorazioneQuickUpdate(queryClient, false, variables.id, data?.updated_at),
        );
      },
    },
  );
}

export function useLavorazioneRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => lavorazioniEntry.remove(id), {
    onSuccess: (_data, id) => {
      evictLavorazioneDomainCache(queryClient, id);
    },
    onSettled: async (_data, error, id) => {
      if (error) return;
      await traceMutationLifecycle(
        { entityType: "lavorazione", entityId: id, operation: "remove" },
        () =>
          invalidateAfterLavorazioneMutations(
            queryClient,
            [cabSyncEventForEntity("lavorazioni", id, "entity_deleted", "lavorazioni")],
            id,
          ),
      );
    },
  });
}

export function useLavorazioneRestoreMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const optimisticAudit = buildLavorazioneOptimisticAudit(user?.id);
  return useServiceMutation(
    ({ id, stato }: { id: string; stato: LavorazioneRow["stato"] }) => lavorazioniEntry.restore(id, stato),
    {
      onMutate: async ({ id, stato }) => {
        const context = await snapshotLavorazioneUpdateQueries(queryClient, id);
        applyOptimisticLavorazioneUpdate(
          queryClient,
          id,
          buildRestoreOptimisticPatch(stato),
          undefined,
          optimisticAudit,
        );
        return context;
      },
      onSuccess: (serverRow, { id }) => {
        applyOptimisticLavorazioneUpdate(queryClient, id, {}, serverRow);
        markRecentLocalGestionaleMutation(["lavorazioni"], id);
      },
      onError: (_err, _variables, context) => {
        if (context) rollbackLavorazioneUpdateQueries(queryClient, context as LavorazioneUpdateOptimisticContext);
      },
      onSettled: async (_data, error, variables) => {
        if (error) return;
        await traceMutationLifecycle(
          { entityType: "lavorazione", entityId: variables.id, operation: "restore" },
          () =>
            invalidateAfterLavorazioneMutations(
              queryClient,
              [cabSyncEventForEntity("lavorazioni", variables.id, "entity_updated", "lavorazioni")],
              variables.id,
              _data?.updated_at,
            ),
        );
      },
    },
  );
}

export function useLavorazioneConcludeMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const optimisticAudit = buildLavorazioneOptimisticAudit(user?.id);
  return useServiceMutation((id: string) => lavorazioniEntry.conclude(id), {
    onMutate: async (id) => {
      const context = await snapshotLavorazioneUpdateQueries(queryClient, id);
      const existing = context.lists
        .flatMap((s) => lavorazioniListCacheRows(s.data))
        .find((r) => r.id === id);
      applyOptimisticLavorazioneUpdate(
        queryClient,
        id,
        buildConcludeOptimisticPatch(existing),
        undefined,
        optimisticAudit,
      );
      return context;
    },
    onSuccess: (serverRow, id) => {
      applyOptimisticLavorazioneUpdate(queryClient, id, {}, serverRow);
      markRecentLocalGestionaleMutation(["lavorazioni"], id);
    },
    onError: (_err, _id, context) => {
      if (context) rollbackLavorazioneUpdateQueries(queryClient, context as LavorazioneUpdateOptimisticContext);
    },
    onSettled: async (_data, error, id) => {
      if (error) return;
      await traceMutationLifecycle(
        { entityType: "lavorazione", entityId: id, operation: "conclude" },
        () =>
          invalidateAfterLavorazioneMutations(
            queryClient,
            [cabSyncEventForEntity("lavorazioni", id, "entity_updated", "lavorazioni")],
            id,
            _data?.updated_at,
          ),
      );
    },
  });
}

export type LavorazioneUpdatePayload = { id: string; data: LavorazioneUpdate };

export type LavorazioneUpdateMutation = UseMutationResult<
  LavorazioneRow,
  Error,
  LavorazioneUpdatePayload
>;

/** Tipo inferito per `onSuccess` UI (creazione). */
export type LavorazioneCreateResult = LavorazioneRow;
