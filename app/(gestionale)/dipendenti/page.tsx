import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { DipendentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function DipendentiPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchGestionalePage(qc, "dipendenti");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dipendenti}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <DipendentiViewLazy listSurface={listSurface} listTier="md" />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
