import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { MagazzinoDeferredHydration } from "@/components/gestionale/magazzino/magazzino-deferred-hydration";
import { MagazzinoViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

async function MagazzinoPageBody() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "magazzino");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <MagazzinoDeferredHydration>
        <UIPageAdapterGate
          page="/magazzino"
          mode="os"
          fallback="legacy"
          schema={getSuggestedSchema("/magazzino")}
        >
          <MagazzinoViewLazy />
        </UIPageAdapterGate>
      </MagazzinoDeferredHydration>
    </GestionaleHydrationBoundary>
  );
}

export default function MagazzinoPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.magazzino}>
      <Suspense fallback={<PageTransitionLoader variant="magazzino" />}>
        <MagazzinoPageBody />
      </Suspense>
    </PageLayout>
  );
}
