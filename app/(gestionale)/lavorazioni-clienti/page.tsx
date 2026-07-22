import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { ClientLavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function LavorazioniClientiPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "lavorazioni_clienti");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.clienti}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <ClientLavorazioniViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
