import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { FatturazioneViewLazy } from "@/components/gestionale/lazy-route-views";
import { FatturazioneDeferredHydration } from "@/components/fatturazione/fatturazione-deferred-hydration";
import { FatturazionePageStructure } from "@/components/fatturazione/fatturazione-page-structure";
import { parseFatturazioneTab } from "@/lib/fatturazione/fatturazione-sections-config";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

type FatturazionePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FatturazionePage({ searchParams }: FatturazionePageProps) {
  const sp = await searchParams;
  const tabRaw = sp.tab;
  const tab = parseFatturazioneTab(typeof tabRaw === "string" ? tabRaw : null);
  const includeOpenItems = tab === "scadenziario";
  const includePayments = tab === "pagamenti";

  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "fatturazione");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.fatturazione}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense fallback={<FatturazionePageStructure mode="skeleton" listSurface={listSurface} />}>
          <FatturazioneDeferredHydration includeOpenItems={includeOpenItems} includePayments={includePayments}>
            <FatturazioneViewLazy listSurface={listSurface} listTier="xl" />
          </FatturazioneDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
