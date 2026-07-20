import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { DipendentiDeferredHydration } from "@/components/gestionale/dipendenti/dipendenti-deferred-hydration";
import { DipendentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function DipendentiPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "dipendenti");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dipendenti}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="dipendenti" />}>
          <DipendentiDeferredHydration>
            <DipendentiViewLazy />
          </DipendentiDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
