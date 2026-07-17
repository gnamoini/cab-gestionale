import type { QueryClient } from "@tanstack/react-query";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

/** Client prefetch catalogo + piani + servizi lite al primo switch vista tagliandi. */
export async function prefetchMezziTagliandiQueries(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.catalog(),
      queryFn: () => maintenancePlansEntry.listTipoCatalog(),
    }),
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.plans(),
      queryFn: () => maintenancePlansEntry.listPlans(),
    }),
    qc.prefetchQuery({
      queryKey: maintenancePlansQueryKeys.servicesLite(),
      queryFn: () => maintenancePlansEntry.listServicesLite(),
    }),
  ]);
}
