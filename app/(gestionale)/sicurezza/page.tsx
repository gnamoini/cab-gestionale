import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { SicurezzaDeferredHydration } from "@/components/gestionale/sicurezza/sicurezza-deferred-hydration";
import { SecurityDashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function SicurezzaPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "sicurezza");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.sicurezza}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="sicurezza" />}>
          <SicurezzaDeferredHydration>
            <SecurityDashboardViewLazy />
          </SicurezzaDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
