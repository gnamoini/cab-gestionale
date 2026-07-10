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
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
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

function dispatchAgendaMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  entityId: string,
  eventType: "entity_updated" | "entity_deleted",
) {
  markRecentLocalGestionaleMutation(["workshop_schedule_events"], entityId);
  dispatchGestionaleLocalMutation(queryClient, ["workshop_schedule_events"], [
    cabSyncEventForEntity("workshop_schedule_events", entityId, eventType, "workshop_schedule_events"),
  ]);
}

export function useWorkshopScheduleMutations() {
  const queryClient = useQueryClient();
  const gestToast = useGestionaleToast();

  const upsertMutation = useServiceMutation(
    (input: WorkshopScheduleUpsertInput) => workshopScheduleEntry.upsert(input),
    {
      onSuccess: async (data) => {
        if (!data?.id) return;
        await traceMutationLifecycle(
          { entityType: "workshop_schedule_event", entityId: data.id, operation: "upsert" },
          async () => {
            dispatchAgendaMutation(queryClient, data.id, "entity_updated");
          },
        );
      },
      onError: (err) => {
        gestToast.errorOnce("agenda-upsert", err, { action: "create" });
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
      onSuccess: async (data) => {
        if (!data?.id) return;
        await traceMutationLifecycle(
          { entityType: "workshop_schedule_event", entityId: data.id, operation: "patchTimes" },
          async () => {
            dispatchAgendaMutation(queryClient, data.id, "entity_updated");
          },
        );
      },
      onError: (err, _input, ctx) => {
        const c = ctx as OptimisticCtx | undefined;
        if (c?.snapshots) {
          rollbackWorkshopScheduleSnapshots((key, data) => queryClient.setQueryData(key, data), c.snapshots);
        }
        gestToast.errorOnce("agenda-patch-times", err, { action: "update" });
      },
    },
  );

  const deleteMutation = useServiceMutation((id: string) => workshopScheduleEntry.softDelete(id), {
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
    onSuccess: async (_data, id) => {
      await traceMutationLifecycle(
        { entityType: "workshop_schedule_event", entityId: id, operation: "delete" },
        async () => {
          dispatchAgendaMutation(queryClient, id, "entity_deleted");
        },
      );
    },
    onError: (err, _id, ctx) => {
      const c = ctx as OptimisticCtx | undefined;
      if (c?.snapshots) {
        rollbackWorkshopScheduleSnapshots((key, data) => queryClient.setQueryData(key, data), c.snapshots);
      }
      gestToast.errorOnce("agenda-delete", err, { action: "delete" });
    },
  });

  return { upsertMutation, patchTimesMutation, deleteMutation };
}
