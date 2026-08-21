import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { MezziViewLazy } from "@/components/gestionale/lazy-route-views";
import { MezziDeferredHydration } from "@/components/gestionale/mezzi/mezzi-deferred-hydration";
import { MezziPageStructure } from "@/components/gestionale/mezzi/mezzi-page-structure";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function MezziPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "mezzi");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.mezzi}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense fallback={<MezziPageStructure mode="skeleton" listSurface={listSurface} />}>
          <MezziDeferredHydration>
            <MezziViewLazy listSurface={listSurface} listTier="xl" />
          </MezziDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
