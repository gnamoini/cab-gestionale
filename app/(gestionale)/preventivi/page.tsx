import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { PreventiviDeferredHydration } from "@/components/preventivi/preventivi-deferred-hydration";
import { PreventiviViewLazy } from "@/components/gestionale/lazy-route-views";
import { Q_PREVENTIVI_TAB } from "@/lib/preventivi/preventivi-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

type PreventiviPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PreventiviPage({ searchParams }: PreventiviPageProps) {
  const sp = await searchParams;
  const tabRaw = sp[Q_PREVENTIVI_TAB];
  const includeOrdini = tabRaw === "ordini";

  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "preventivi");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.preventivi}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="preventivi" />}>
          <PreventiviDeferredHydration includeOrdini={includeOrdini}>
            <PreventiviViewLazy />
          </PreventiviDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
