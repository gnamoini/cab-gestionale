import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchDashboardPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function DashboardPage() {
  const dehydratedState = await prefetchDashboardPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dashboard" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <DashboardViewLazy />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
