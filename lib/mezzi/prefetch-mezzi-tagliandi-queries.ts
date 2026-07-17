import type { QueryClient } from "@tanstack/react-query";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import type { ServiceResult } from "@/src/services/service-result";

function unwrapServiceResult<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** Client prefetch catalogo + piani + servizi lite al primo switch vista tagliandi. */
export async function prefetchMezziTagliandiQueries(qc: QueryClient): Promise<void> {
  await Promise.all([
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
  ]);
}
