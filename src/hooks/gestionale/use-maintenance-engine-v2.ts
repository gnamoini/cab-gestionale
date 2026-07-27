"use client";

import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import type { RegisterMaintenanceExecutionInput, UpsertVehicleMaintenanceConfigInput } from "@/lib/maintenance-plans/v2-types";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const maintenanceEngineV2QueryKeys = {
  mezzoConfigs: (mezzoId: string) => [...maintenancePlansQueryKeys.root, "configs", mezzoId] as const,
  effectivePreset: (configId: string) => [...maintenancePlansQueryKeys.root, "effective-preset", configId] as const,
  /** v2: include cliente/matricola su overview. */
  overview: () => [...maintenancePlansQueryKeys.root, "overview", "v2-oggetto"] as const,
  hierarchy: () => [...maintenancePlansQueryKeys.root, "hierarchy"] as const,
  timelineExtras: (mezzoId: string) => [...maintenancePlansQueryKeys.root, "timeline-extras", mezzoId] as const,
};

export function useMezzoMaintenanceConfigsQuery(input: {
  mezzoId: string | undefined;
  enabled?: boolean;
}) {
  const id = input.mezzoId?.trim() ?? "";
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.mezzoConfigs(id),
    () =>
      maintenancePlansEntry.listMezzoConfigs({
        mezzoId: id,
      }),
    { enabled: Boolean(input.enabled !== false && id) },
  );
}

export function useEffectivePresetForConfigQuery(configId: string | undefined, enabled = true) {
  const id = configId?.trim() ?? "";
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.effectivePreset(id),
    () => maintenancePlansEntry.loadEffectivePresetForConfig(id),
    { enabled: Boolean(enabled && id) },
  );
}

export function useTagliandiOverviewQuery(enabled = true) {
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.overview(),
    () => maintenancePlansEntry.listTagliandiOverview(),
    { enabled, staleTime: 60_000 },
  );
}

export function useMaintenancePresetHierarchyQuery(enabled = true) {
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.hierarchy(),
    () => maintenancePlansEntry.listPresetHierarchy(),
    { enabled },
  );
}

async function invalidateV2(qc: ReturnType<typeof useQueryClient>, mezzoId?: string) {
  await qc.invalidateQueries({ queryKey: maintenancePlansQueryKeys.root });
  await qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.overview() });
  if (mezzoId) {
    await qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.mezzoConfigs(mezzoId) });
  }
}

export function useUpsertMezzoConfigMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: UpsertVehicleMaintenanceConfigInput) => maintenancePlansEntry.upsertMezzoConfig(input),
    {
      onSettled: async (_d, _e, vars) => {
        await invalidateV2(qc, vars.mezzoId);
      },
    },
  );
}

export function useDeleteMezzoConfigMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: { configId: string; mezzoId: string }) =>
      maintenancePlansEntry.softDeleteMezzoConfig(input.configId, input.mezzoId),
    {
      onSettled: async (_d, _e, vars) => {
        await invalidateV2(qc, vars.mezzoId);
      },
    },
  );
}

export function useRegisterExecutionV2Mutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: RegisterMaintenanceExecutionInput) => maintenancePlansEntry.registerExecutionV2(input),
    {
      onSettled: async (_d, _e, vars) => {
        await invalidateV2(qc, vars.mezzoId);
      },
    },
  );
}

export function useBulkAssignPresetMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: { presetId: string; mezzoIds: string[]; replaceExisting?: boolean }) =>
      maintenancePlansEntry.bulkAssignPresetToMezzi(input),
    {
      onSettled: async () => {
        await invalidateV2(qc);
      },
    },
  );
}

export function useRecomputeForecastMutation() {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: { configId: string; mezzoId: string }) => maintenancePlansEntry.recomputeForecast(input.configId),
    {
      onSettled: async (_d, _e, vars) => {
        await invalidateV2(qc, vars.mezzoId);
      },
    },
  );
}

export function useMezziWithoutPresetQuery(enabled = true) {
  return useServiceQuery(
    [...maintenancePlansQueryKeys.root, "without-preset"] as const,
    () => maintenancePlansEntry.listMezziWithoutPreset(),
    { enabled },
  );
}

export function useMezzoMaintenanceTimelineExtrasQuery(mezzoId: string | undefined, enabled = true) {
  const id = mezzoId?.trim() ?? "";
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.timelineExtras(id),
    () => maintenancePlansEntry.listMezzoMaintenanceTimelineExtras(id),
    { enabled: enabled && id.length > 0, staleTime: 60_000 },
  );
}
