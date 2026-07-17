import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ReportDeferredHydration } from "@/components/gestionale/report/report-deferred-hydration";
import { ReportViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function ReportPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "report");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="report" />}>
        <ReportDeferredHydration>
          <UIPageAdapterGate page="/report" mode="os" fallback="legacy" schema={getSuggestedSchema("/report")}>
            <ReportViewLazy />
          </UIPageAdapterGate>
        </ReportDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
