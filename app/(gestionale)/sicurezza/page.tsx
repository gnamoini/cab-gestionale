import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { SecurityDashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function SicurezzaPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "sicurezza");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.sicurezza}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <SecurityDashboardViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
