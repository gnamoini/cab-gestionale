import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ImpostazioniDeferredHydration } from "@/components/gestionale/impostazioni/impostazioni-deferred-hydration";
import { SistemaImpostazioniPageViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function ImpostazioniPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "impostazioni");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="impostazioni" />}>
        <ImpostazioniDeferredHydration>
          <SistemaImpostazioniPageViewLazy />
        </ImpostazioniDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
