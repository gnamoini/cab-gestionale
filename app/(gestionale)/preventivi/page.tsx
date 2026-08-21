import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { PageLayout } from "@/components/design-system";
import { PreventiviViewLazy } from "@/components/gestionale/lazy-route-views";
import { PreventiviDeferredHydration } from "@/components/preventivi/preventivi-deferred-hydration";
import { PreventiviPageStructure } from "@/components/preventivi/preventivi-page-structure";
import { Q_PREVENTIVI_TAB } from "@/lib/preventivi/preventivi-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

type PreventiviPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PreventiviPage({ searchParams }: PreventiviPageProps) {
  const sp = await searchParams;
  const tabRaw = sp[Q_PREVENTIVI_TAB];
  if (tabRaw === "ordini") {
    redirect("/ordini-fornitori");
  }

  const qc = createServerQueryClient();
  const listSurface = await resolveListSurfaceForPage();
  await prefetchCriticalPage(qc, "preventivi");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.preventivi}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <Suspense fallback={<PreventiviPageStructure mode="skeleton" listSurface={listSurface} />}>
          <PreventiviDeferredHydration>
            <PreventiviViewLazy listSurface={listSurface} listTier="xl" />
          </PreventiviDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
