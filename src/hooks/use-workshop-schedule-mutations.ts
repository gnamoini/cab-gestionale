"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  applyOptimisticSession,
  removeOptimisticSession,
  snapshotWorkshopScheduleQueries,
  rollbackWorkshopScheduleSnapshots,
} from "@/lib/workshop-schedule/workshop-schedule-optimistic-cache";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { workshopScheduleQueryKeys } from "@/src/services/domain/workshop-schedule-domain.queries";
import {
  workshopScheduleEntry,
  type WorkshopSchedulePatchTimesInput,
  type WorkshopScheduleUpsertInput,
} from "@/lib/domain/workshop-schedule-entry";

type OptimisticCtx = {
  snapshots: ReturnType<typeof snapshotWorkshopScheduleQueries>;
};

export function useWorkshopScheduleMutations() {
  const queryClient = useQueryClient();
  const invalidateKeys = [workshopScheduleQueryKeys.root] as const;

  const upsertMutation = useServiceMutation(
    (input: WorkshopScheduleUpsertInput) => workshopScheduleEntry.upsert(input),
    {
      invalidateQueryKeys: [invalidateKeys],
      onSuccess: (data) => {
        if (data?.id) {
          markRecentLocalGestionaleMutation(["workshop_schedule_events"], data.id);
          dispatchGestionaleLocalMutation(queryClient, ["workshop_schedule_events"], [
            cabSyncEventForEntity("workshop_schedule_events", data.id, "entity_updated", "workshop_schedule_events"),
          ]);
        }
      },
    },
  );

  const patchTimesMutation = useServiceMutation(
    (input: WorkshopSchedulePatchTimesInput) => workshopScheduleEntry.patchTimes(input),
    {
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: workshopScheduleQueryKeys.root });
        const snapshots = snapshotWorkshopScheduleQueries(() =>
          queryClient.getQueriesData<WorkshopScheduleSessionView[]>({ queryKey: workshopScheduleQueryKeys.root }) as Array<
            [readonly unknown[], WorkshopScheduleSessionView[] | undefined]
          >,
        );
        queryClient.setQueriesData<WorkshopScheduleSessionView[]>(
          { queryKey: workshopScheduleQueryKeys.root },
          (prev) => {
            const existing = (prev ?? []).find((s) => s.id === input.id);
            if (!existing) return prev;
            return applyOptimisticSession(prev, {
              ...existing,
              startAt: input.startAt,
              endAt: input.endAt,
              planningStatus: "rescheduled",
              revision: existing.revision + 1,
            });
          },
        );
        return { snapshots } satisfies OptimisticCtx;
      },
      onSuccess: (data) => {
        if (data?.id) {
          markRecentLocalGestionaleMutation(["workshop_schedule_events"], data.id);
          dispatchGestionaleLocalMutation(queryClient, ["workshop_schedule_events"], [
            cabSyncEventForEntity("workshop_schedule_events", data.id, "entity_updated", "workshop_schedule_events"),
          ]);
        }
        void queryClient.invalidateQueries({ queryKey: workshopScheduleQueryKeys.root });
      },
      onError: (_e, _input, ctx) => {
        const c = ctx as OptimisticCtx | undefined;
        if (!c?.snapshots) return;
        rollbackWorkshopScheduleSnapshots((key, data) => queryClient.setQueryData(key, data), c.snapshots);
      },
    },
  );

  const deleteMutation = useServiceMutation((id: string) => workshopScheduleEntry.softDelete(id), {
    invalidateQueryKeys: [invalidateKeys],
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workshopScheduleQueryKeys.root });
      const snapshots = snapshotWorkshopScheduleQueries(() =>
        queryClient.getQueriesData<WorkshopScheduleSessionView[]>({ queryKey: workshopScheduleQueryKeys.root }) as Array<
          [readonly unknown[], WorkshopScheduleSessionView[] | undefined]
        >,
      );
      queryClient.setQueriesData<WorkshopScheduleSessionView[]>(
        { queryKey: workshopScheduleQueryKeys.root },
        (prev) => removeOptimisticSession(prev, id),
      );
      return { snapshots } satisfies OptimisticCtx;
    },
    onSuccess: (_data, id) => {
      markRecentLocalGestionaleMutation(["workshop_schedule_events"], id);
      dispatchGestionaleLocalMutation(queryClient, ["workshop_schedule_events"], [
        cabSyncEventForEntity("workshop_schedule_events", id, "entity_deleted", "workshop_schedule_events"),
      ]);
    },
    onError: (_e, _id, ctx) => {
      const c = ctx as OptimisticCtx | undefined;
      if (!c?.snapshots) return;
      rollbackWorkshopScheduleSnapshots((key, data) => queryClient.setQueryData(key, data), c.snapshots);
    },
  });

  return { upsertMutation, patchTimesMutation, deleteMutation };
}
