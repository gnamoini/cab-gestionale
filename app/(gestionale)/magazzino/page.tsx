import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { MagazzinoDeferredHydration } from "@/components/gestionale/magazzino/magazzino-deferred-hydration";
import { MagazzinoViewLazy } from "@/components/gestionale/lazy-route-views";
import { UIPageAdapterGate } from "@/components/gestionale/ui-page-adapter-gate";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function MagazzinoPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "magazzino");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>
        <MagazzinoDeferredHydration>
          <UIPageAdapterGate
            page="/magazzino"
            mode="os"
            fallback="legacy"
            schema={getSuggestedSchema("/magazzino")}
          >
            <MagazzinoViewLazy />
          </UIPageAdapterGate>
        </MagazzinoDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
