import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { MezziView } from "@/components/gestionale/mezzi/mezzi-view";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchMezziPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function MezziPage() {
  const dehydratedState = await prefetchMezziPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="mezzi" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <MezziView />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
