export { lavorazioniPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { LavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { LavorazioniDeferredHydration } from "@/components/gestionale/lavorazioni/lavorazioni-deferred-hydration";
import { LavorazioniPageStructure } from "@/components/gestionale/lavorazioni/lavorazioni-page-structure";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function LavorazioniPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "lavorazioni");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.lavorazioni}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense
          fallback={<LavorazioniPageStructure mode="skeleton" listSurface={listSurface} />}
        >
          <LavorazioniDeferredHydration>
            <UIPageAdapterGate
              page="/lavorazioni"
              mode="os"
              fallback="legacy"
              schema={getSuggestedSchema("/lavorazioni")}
            >
              <LavorazioniViewLazy listSurface={listSurface} listTier="xl" />
            </UIPageAdapterGate>
          </LavorazioniDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
