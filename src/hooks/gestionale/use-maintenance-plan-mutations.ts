"use client";

import { useQueryClient } from "@tanstack/react-query";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import type { RegisterMaintenanceServiceInput, UpsertMaintenancePlanInput } from "@/lib/maintenance-plans/types";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { maintenanceEngineV2QueryKeys } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";

async function invalidateMaintenancePlans(qc: ReturnType<typeof useQueryClient>, mezzoId?: string) {
  await qc.invalidateQueries({ queryKey: maintenancePlansQueryKeys.root });
  await qc.invalidateQueries({ queryKey: [...maintenancePlansQueryKeys.root, "overview"] });
  await qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.overview() });
  // All mezzo configs (prefix match on ["maintenancePlans","configs", …]).
  await qc.invalidateQueries({ queryKey: [...maintenancePlansQueryKeys.root, "configs"] });
  if (mezzoId) {
    await qc.invalidateQueries({ queryKey: [...maintenancePlansQueryKeys.root, "statuses", mezzoId] });
    await qc.invalidateQueries({ queryKey: maintenancePlansQueryKeys.mezzoHistory(mezzoId) });
    await qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.mezzoConfigs(mezzoId) });
  }
}

export function useMaintenancePlanUpsertMutation() {
  const qc = useQueryClient();
  return useServiceMutation((input: UpsertMaintenancePlanInput) => maintenancePlansEntry.upsertPlan(input), {
    onSettled: async () => {
      await invalidateMaintenancePlans(qc);
    },
  });
}

export function useMaintenancePlanDeleteMutation() {
  const qc = useQueryClient();
  return useServiceMutation((planId: string) => maintenancePlansEntry.softDeletePlan(planId), {
    onSettled: async () => {
      await invalidateMaintenancePlans(qc);
    },
  });
}

export function useRegisterMaintenanceServiceMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: RegisterMaintenanceServiceInput) => maintenancePlansEntry.registerService(input),
    {
      onSettled: async (_data, _err, variables) => {
        await invalidateMaintenancePlans(qc, variables.mezzoId);
      },
    },
  );
}

export function useToggleTagliandiMatrixCellMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: {
      mezzoId: string;
      planId: string;
      milestoneOre: number;
      done: boolean;
      mezzoOreSnapshot: number;
      existingServiceId?: string | null;
    }) => maintenancePlansEntry.toggleMatrixMilestone(input),
    {
      onSettled: async (_data, _err, variables) => {
        await invalidateMaintenancePlans(qc, variables.mezzoId);
      },
    },
  );
}
