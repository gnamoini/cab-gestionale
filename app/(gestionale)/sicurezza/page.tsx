import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { SecurityDashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

export default async function SicurezzaPage() {
  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchGestionalePage(qc, "sicurezza");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.sicurezza} contentReveal>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <SecurityDashboardViewLazy listSurface={listSurface} listTier="lg" />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
