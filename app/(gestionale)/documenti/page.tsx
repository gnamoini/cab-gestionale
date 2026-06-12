import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DocumentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchDocumentiPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function DocumentiPage() {
  const dehydratedState = await prefetchDocumentiPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="documenti" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <DocumentiViewLazy />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
