import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { AgendaOfficinaViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchAgendaPage } from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function AgendaPage() {
  const dehydratedState = await prefetchAgendaPage();
  return (
    <PageLayout
      title={STRUCTURAL_ROUTE_PAGE_TITLES.agenda}
      description="Pianificazione sessioni di lavoro"
    >
      <Suspense fallback={<PageTransitionLoader variant="agenda" />}>
        <GestionaleHydrationBoundary state={dehydratedState}>
          <AgendaOfficinaViewLazy />
        </GestionaleHydrationBoundary>
      </Suspense>
    </PageLayout>
  );
}
