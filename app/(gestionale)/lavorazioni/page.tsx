import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { LavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchLavorazioniPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function LavorazioniPage() {
  const dehydratedState = await prefetchLavorazioniPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="lavorazioni" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <UIPageAdapterGate
          page="/lavorazioni"
          mode="os"
          fallback="legacy"
          schema={getSuggestedSchema("/lavorazioni")}
        >
          <LavorazioniViewLazy />
        </UIPageAdapterGate>
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
