import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { DashboardPageStructure } from "@/components/dashboard/dashboard-page-structure";
import { DashboardDeferredHydration } from "@/components/dashboard/dashboard-deferred-hydration";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function DashboardPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "dashboard");
  return (
    <PageLayout
      title={STRUCTURAL_ROUTE_PAGE_TITLES.dashboard}
      contentTestId="page-ready-toolbar"
      contentReveal
    >
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense fallback={<DashboardPageStructure mode="skeleton" />}>
          <DashboardDeferredHydration>
            <DashboardViewLazy />
          </DashboardDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
