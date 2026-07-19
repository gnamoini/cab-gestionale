import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { MezziDeferredHydration } from "@/components/gestionale/mezzi/mezzi-deferred-hydration";
import { MezziViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function MezziPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "mezzi");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={null}>
        <MezziDeferredHydration>
          <MezziViewLazy />
        </MezziDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
