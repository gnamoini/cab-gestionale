import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { MagazzinoViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function MagazzinoPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "magazzino");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.magazzino}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <UIPageAdapterGate
          page="/magazzino"
          mode="os"
          fallback="legacy"
          schema={getSuggestedSchema("/magazzino")}
        >
          <MagazzinoViewLazy />
        </UIPageAdapterGate>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
