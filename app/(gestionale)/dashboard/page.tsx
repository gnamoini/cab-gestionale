import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { DashboardDeferredHydration } from "@/components/dashboard/dashboard-deferred-hydration";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function DashboardPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dashboard} contentTestId="page-ready-toolbar">
      <Suspense fallback={<PageTransitionLoader variant="dashboard" />}>
        <DashboardDeferredHydration>
          <DashboardViewLazy />
        </DashboardDeferredHydration>
      </Suspense>
    </PageLayout>
  );
}
