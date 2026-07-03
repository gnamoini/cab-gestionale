import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { FatturazioneViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchFatturazionePage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function FatturazionePage() {
  const dehydratedState = await prefetchFatturazionePage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="fatturazione" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <FatturazioneViewLazy />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
