import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { MagazzinoViewLazy } from "@/components/gestionale/lazy-route-views";
import { MagazzinoPageStructure } from "@/components/gestionale/magazzino/magazzino-page-structure";
import { MagazzinoDeferredHydration } from "@/components/gestionale/magazzino/magazzino-deferred-hydration";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function MagazzinoPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "magazzino");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.magazzino}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense
          fallback={<MagazzinoPageStructure mode="skeleton" listSurface={listSurface} />}
        >
          <MagazzinoDeferredHydration>
            <UIPageAdapterGate
              page="/magazzino"
              mode="os"
              fallback="legacy"
              schema={getSuggestedSchema("/magazzino")}
            >
              <MagazzinoViewLazy listSurface={listSurface} listTier="xl" />
            </UIPageAdapterGate>
          </MagazzinoDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
