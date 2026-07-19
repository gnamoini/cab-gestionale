import { PageLayout } from "@/components/design-system";
import { ProductionReadinessPageStructure } from "@/components/dashboard/security/production-readiness-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ProductionReadinessLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES["production-readiness"]}>
      <ProductionReadinessPageStructure mode="skeleton" />
    </PageLayout>
  );
}
