import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { ClientPortalDeferredHydration } from "@/components/lavorazioni-clienti/client-portal-deferred-hydration";
import { ClientLavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function LavorazioniClientiPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "lavorazioni_clienti");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={null}>
        <ClientPortalDeferredHydration>
          <ClientLavorazioniViewLazy />
        </ClientPortalDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
