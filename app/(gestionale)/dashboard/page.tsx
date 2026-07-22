import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function DashboardPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "dashboard");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dashboard} contentTestId="page-ready-toolbar">
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <DashboardViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
