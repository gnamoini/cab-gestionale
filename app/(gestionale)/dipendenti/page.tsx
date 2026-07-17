import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DipendentiDeferredHydration } from "@/components/gestionale/dipendenti/dipendenti-deferred-hydration";
import { DipendentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function DipendentiPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "dipendenti");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="dipendenti" />}>
        <DipendentiDeferredHydration>
          <DipendentiViewLazy />
        </DipendentiDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
