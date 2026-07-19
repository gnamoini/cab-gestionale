import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { DocumentiDeferredHydration } from "@/components/gestionale/documenti/documenti-deferred-hydration";
import { DocumentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function DocumentiPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "documenti");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={null}>
        <DocumentiDeferredHydration>
          <DocumentiViewLazy />
        </DocumentiDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
