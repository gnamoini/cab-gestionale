import { PageLayout } from "@/components/design-system";
import { DashboardPageStructure } from "@/components/dashboard/dashboard-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function DashboardLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dashboard}>
      <DashboardPageStructure mode="skeleton" />
    </PageLayout>
  );
}
