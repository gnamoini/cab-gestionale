import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { AgendaOfficinaViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchAgendaPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function AgendaPage() {
  const dehydratedState = await prefetchAgendaPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="agenda" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <AgendaOfficinaViewLazy />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
