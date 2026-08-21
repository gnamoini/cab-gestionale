import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { OrdiniFornitoriPageViewLazy } from "@/components/gestionale/lazy-route-views";
import { OrdiniFornitoriDeferredHydration } from "@/components/ordini-fornitori/ordini-fornitori-deferred-hydration";
import { OrdiniFornitoriPageStructure } from "@/components/ordini-fornitori/ordini-fornitori-page-structure";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function OrdiniFornitoriPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "ordini_fornitori");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.ordini_fornitori}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense fallback={<OrdiniFornitoriPageStructure mode="skeleton" listSurface={listSurface} />}>
          <OrdiniFornitoriDeferredHydration>
            <OrdiniFornitoriPageViewLazy listSurface={listSurface} listTier="xl" />
          </OrdiniFornitoriDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
