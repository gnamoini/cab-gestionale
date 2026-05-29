"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { cabSyncEventForEntity, invalidateAfterLavorazioneMutations } from "@/src/lib/react-query/invalidate-related";
import {
  applyOptimisticLavorazioneUpdate,
  rollbackLavorazioneUpdateQueries,
  settleLavorazioneQuickUpdate,
  snapshotLavorazioneUpdateQueries,
  type LavorazioneUpdateOptimisticContext,
} from "@/src/lib/react-query/lavorazioni-optimistic";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import {
  lavorazioniService,
  type LavorazioneInsert,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

export function useLavorazioneCreateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((data: LavorazioneInsert) => lavorazioniService.create(data), {
    onSettled: async (data, error) => {
      if (error) return;
      const cabSyncEvents =
        data?.id != null
          ? [cabSyncEventForEntity("lavorazioni", data.id, "entity_created", "lavorazioni")]
          : undefined;
      await invalidateAfterLavorazioneMutations(queryClient, cabSyncEvents);
    },
  });
}

export function useLavorazioneUpdateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(
    ({ id, data }: { id: string; data: LavorazioneUpdate }) => lavorazioniService.update(id, data),
    {
      onMutate: async (variables) => {
        const context = await snapshotLavorazioneUpdateQueries(queryClient, variables.id);
        applyOptimisticLavorazioneUpdate(queryClient, variables.id, variables.data);
        return context;
      },
      onSuccess: (serverRow, variables) => {
        applyOptimisticLavorazioneUpdate(queryClient, variables.id, variables.data, serverRow);
        markRecentLocalGestionaleMutation(["lavorazioni"], variables.id);
      },
      onError: (_err, _variables, context) => {
        if (context) rollbackLavorazioneUpdateQueries(queryClient, context as LavorazioneUpdateOptimisticContext);
      },
      onSettled: (_data, error) => {
        settleLavorazioneQuickUpdate(queryClient, Boolean(error));
      },
    },
  );
}

export function useLavorazioneRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => lavorazioniService.remove(id), {
    onSettled: async (_data, error, id) => {
      if (error) return;
      await invalidateAfterLavorazioneMutations(queryClient, [
        cabSyncEventForEntity("lavorazioni", id, "entity_deleted", "lavorazioni"),
      ]);
    },
  });
}

export function useLavorazioneRestoreMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(
    ({ id, stato }: { id: string; stato: LavorazioneRow["stato"] }) => lavorazioniService.restore(id, stato),
    {
      onSettled: async (_data, error, variables) => {
        if (error) return;
        await invalidateAfterLavorazioneMutations(queryClient, [
          cabSyncEventForEntity("lavorazioni", variables.id, "entity_updated", "lavorazioni"),
        ]);
      },
    },
  );
}

export function useLavorazioneConcludeMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => lavorazioniService.conclude(id), {
    onSettled: async (_data, error, id) => {
      if (error) return;
      await invalidateAfterLavorazioneMutations(queryClient, [
        cabSyncEventForEntity("lavorazioni", id, "entity_updated", "lavorazioni"),
      ]);
    },
  });
}

/** @deprecated Usare `useLavorazioneConcludeMutation`. */
export function useLavorazioneArchiveMutation() {
  return useLavorazioneConcludeMutation();
}

export type LavorazioneUpdatePayload = { id: string; data: LavorazioneUpdate };

/** Tipo inferito per `onSuccess` UI (creazione). */
export type LavorazioneCreateResult = LavorazioneRow;
