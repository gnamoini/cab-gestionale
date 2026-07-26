import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { PreventiviViewLazy } from "@/components/gestionale/lazy-route-views";
import { Q_PREVENTIVI_TAB } from "@/lib/preventivi/preventivi-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

type PreventiviPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PreventiviPage({ searchParams }: PreventiviPageProps) {
  const sp = await searchParams;
  const tabRaw = sp[Q_PREVENTIVI_TAB];
  const includeOrdini = tabRaw === "ordini";

  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchGestionalePage(qc, "preventivi", { includeOrdini });
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.preventivi}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <PreventiviViewLazy listSurface={listSurface} listTier="xl" />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
