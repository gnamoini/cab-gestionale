import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { SicurezzaDeferredHydration } from "@/components/gestionale/sicurezza/sicurezza-deferred-hydration";
import { SecurityDashboardViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function SicurezzaPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "sicurezza");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="sicurezza" />}>
        <SicurezzaDeferredHydration>
          <SecurityDashboardViewLazy />
        </SicurezzaDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
