import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { LavorazioniDeferredHydration } from "@/components/gestionale/lavorazioni/lavorazioni-deferred-hydration";
import { LavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function LavorazioniPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "lavorazioni");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="lavorazioni" />}>
        <LavorazioniDeferredHydration>
          <UIPageAdapterGate
            page="/lavorazioni"
            mode="os"
            fallback="legacy"
            schema={getSuggestedSchema("/lavorazioni")}
          >
            <LavorazioniViewLazy />
          </UIPageAdapterGate>
        </LavorazioniDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
