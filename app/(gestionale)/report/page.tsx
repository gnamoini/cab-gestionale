import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ReportViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchReportPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function ReportPage() {
  const dehydratedState = await prefetchReportPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="report" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <UIPageAdapterGate page="/report" mode="os" fallback="legacy" schema={getSuggestedSchema("/report")}>
          <ReportViewLazy />
        </UIPageAdapterGate>
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
