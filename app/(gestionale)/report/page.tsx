import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { ReportDeferredHydration } from "@/components/gestionale/report/report-deferred-hydration";
import { ReportViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function ReportPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "report");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="report" />}>
          <ReportDeferredHydration>
            <UIPageAdapterGate page="/report" mode="os" fallback="legacy" schema={getSuggestedSchema("/report")}>
              <ReportViewLazy />
            </UIPageAdapterGate>
          </ReportDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
