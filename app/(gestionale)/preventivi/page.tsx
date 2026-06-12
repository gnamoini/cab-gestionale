import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { PreventiviView } from "@/components/preventivi/preventivi-view";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchPreventiviPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function PreventiviPage() {
  const dehydratedState = await prefetchPreventiviPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="preventivi" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <PreventiviView />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
