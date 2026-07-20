import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { ProductionReadinessViewLazy } from "@/components/gestionale/lazy-route-views";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function SicurezzaProductionReadinessPage() {
  return (
    <PageLayout
      title={STRUCTURAL_ROUTE_PAGE_TITLES["production-readiness"]}
      description="Gate automatico pilot → production: verifica flag, storage, RBAC e coerenza codice prima del deploy."
    >
      <Suspense fallback={<PageTransitionLoader variant="production-readiness" />}>
        <ProductionReadinessViewLazy />
      </Suspense>
    </PageLayout>
  );
}
