import type { QueryClient } from "@tanstack/react-query";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { isMaintenanceEngineV2Enabled } from "@/lib/officina/maintenance-engine-v2-flag";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { maintenanceEngineV2QueryKeys } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import type { ServiceResult } from "@/src/services/service-result";

function unwrapServiceResult<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** Client prefetch catalogo + piani + servizi lite al primo switch vista tagliandi. */
export async function prefetchMezziTagliandiQueries(qc: QueryClient): Promise<void> {
  const tasks = [
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.catalog(),
      queryFn: async () => unwrapServiceResult(await maintenancePlansEntry.listTipoCatalog(), []),
    }),
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.plans(),
      queryFn: async () => unwrapServiceResult(await maintenancePlansEntry.listPlans(), []),
    }),
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.servicesLite(),
      queryFn: async () => unwrapServiceResult(await maintenancePlansEntry.listServicesLite(), []),
    }),
  ];
  if (isMaintenanceEngineV2Enabled()) {
    tasks.push(
      qc.prefetchQuery({
        queryKey: maintenanceEngineV2QueryKeys.overview(),
        queryFn: async () => unwrapServiceResult(await maintenancePlansEntry.listTagliandiOverview(), []),
      }),
    );
  }
  await Promise.all(tasks);
}
