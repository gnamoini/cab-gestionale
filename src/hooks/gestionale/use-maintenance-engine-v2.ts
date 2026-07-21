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
  overview: () => [...maintenancePlansQueryKeys.root, "overview"] as const,
  hierarchy: () => [...maintenancePlansQueryKeys.root, "hierarchy"] as const,
};

export function useMezzoMaintenanceConfigsQuery(input: {
  mezzoId: string | undefined;
  oreKm: number;
  kmFromMeta?: number | null;
  tipoAttrezzatura: string;
  tagliandiEnabled?: boolean;
  enabled?: boolean;
}) {
  const id = input.mezzoId?.trim() ?? "";
  return useServiceQuery(
    maintenanceEngineV2QueryKeys.mezzoConfigs(id),
    () =>
      maintenancePlansEntry.listMezzoConfigs({
        mezzoId: id,
        oreKm: input.oreKm,
        kmFromMeta: input.kmFromMeta,
        tipoAttrezzatura: input.tipoAttrezzatura,
        tagliandiEnabled: input.tagliandiEnabled,
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
