import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { MagazzinoViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchMagazzinoPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function MagazzinoPage() {
  const dehydratedState = await prefetchMagazzinoPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <UIPageAdapterGate
          page="/magazzino"
          mode="os"
          fallback="legacy"
          schema={getSuggestedSchema("/magazzino")}
        >
          <MagazzinoViewLazy />
        </UIPageAdapterGate>
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
