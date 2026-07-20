import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { DocumentiDeferredHydration } from "@/components/gestionale/documenti/documenti-deferred-hydration";
import { DocumentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function DocumentiPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "documenti");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.documenti}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="documenti" />}>
          <DocumentiDeferredHydration>
            <DocumentiViewLazy />
          </DocumentiDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
