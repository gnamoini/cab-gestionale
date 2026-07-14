"use client";

import { useQuery } from "@tanstack/react-query";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { useServiceQuery } from "@/src/hooks/use-service-query";

export const maintenancePlansQueryKeys = {
  root: ["maintenance-plans"] as const,
  catalog: () => [...maintenancePlansQueryKeys.root, "catalog"] as const,
  plans: () => [...maintenancePlansQueryKeys.root, "plans"] as const,
  mezzoStatuses: (mezzoId: string, tipo: string, ore: number) =>
    [...maintenancePlansQueryKeys.root, "statuses", mezzoId, tipo, ore] as const,
  mezzoHistory: (mezzoId: string) => [...maintenancePlansQueryKeys.root, "history", mezzoId] as const,
  servicesLite: () => [...maintenancePlansQueryKeys.root, "services-lite"] as const,
};

export function useMaintenancePlansCatalogQuery(enabled = true) {
  return useServiceQuery(maintenancePlansQueryKeys.catalog(), () => maintenancePlansEntry.listTipoCatalog(), {
    enabled,
  });
}

export function useMaintenancePlansListQuery(enabled = true) {
  return useServiceQuery(maintenancePlansQueryKeys.plans(), () => maintenancePlansEntry.listPlans(), {
    enabled,
  });
}

export function useMezzoMaintenanceStatusesQuery(input: {
  mezzoId: string | undefined;
  tipoAttrezzatura: string;
  currentOreMezzo: number;
  enabled?: boolean;
}) {
  const id = input.mezzoId?.trim() ?? "";
  const enabled = Boolean(input.enabled && id);
  return useServiceQuery(
    maintenancePlansQueryKeys.mezzoStatuses(id, input.tipoAttrezzatura, input.currentOreMezzo),
    () =>
      maintenancePlansEntry.listMezzoPlanStatuses({
        mezzoId: id,
        tipoAttrezzatura: input.tipoAttrezzatura,
        currentOreMezzo: input.currentOreMezzo,
      }),
    { enabled },
  );
}

export function useMezzoMaintenanceHistoryQuery(mezzoId: string | undefined, enabled = true) {
  const id = mezzoId?.trim() ?? "";
  return useServiceQuery(
    maintenancePlansQueryKeys.mezzoHistory(id),
    () => maintenancePlansEntry.listServicesByMezzo(id),
    { enabled: enabled && id.length > 0 },
  );
}

export function useMaintenanceRicambiSearchQuery(term: string, enabled: boolean) {
  return useQuery({
    queryKey: [...maintenancePlansQueryKeys.root, "ricambi-search", term] as const,
    queryFn: async () => {
      const res = await maintenancePlansEntry.searchRicambiForPlan(term);
      if (!res.success) throw new Error(res.error ?? "Errore ricerca ricambi.");
      return res.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useMaintenanceServicesLiteQuery(enabled = true) {
  return useServiceQuery(
    maintenancePlansQueryKeys.servicesLite(),
    () => maintenancePlansEntry.listServicesLite(),
    { enabled },
  );
}
