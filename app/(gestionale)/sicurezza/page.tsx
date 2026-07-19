import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
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
      <Suspense fallback={null}>
        <SicurezzaDeferredHydration>
          <SecurityDashboardViewLazy />
        </SicurezzaDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
