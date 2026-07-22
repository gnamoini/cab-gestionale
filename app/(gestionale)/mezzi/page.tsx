import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { MezziViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function MezziPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "mezzi");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.mezzi}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <MezziViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
