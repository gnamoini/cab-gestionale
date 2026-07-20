import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { LavorazioniDeferredHydration } from "@/components/gestionale/lavorazioni/lavorazioni-deferred-hydration";
import { LavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

async function LavorazioniPageBody() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "lavorazioni");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <LavorazioniDeferredHydration>
        <UIPageAdapterGate
          page="/lavorazioni"
          mode="os"
          fallback="legacy"
          schema={getSuggestedSchema("/lavorazioni")}
        >
          <LavorazioniViewLazy />
        </UIPageAdapterGate>
      </LavorazioniDeferredHydration>
    </GestionaleHydrationBoundary>
  );
}

export default function LavorazioniPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.lavorazioni}>
      <Suspense fallback={<PageTransitionLoader variant="lavorazioni" />}>
        <LavorazioniPageBody />
      </Suspense>
    </PageLayout>
  );
}
