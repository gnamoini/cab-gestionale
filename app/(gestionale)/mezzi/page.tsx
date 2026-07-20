import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { MezziDeferredHydration } from "@/components/gestionale/mezzi/mezzi-deferred-hydration";
import { MezziViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function MezziPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "mezzi");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.mezzi}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="mezzi" />}>
          <MezziDeferredHydration>
            <MezziViewLazy />
          </MezziDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
