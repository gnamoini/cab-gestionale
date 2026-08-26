export { documentiPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { DocumentiViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default async function DocumentiPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "documenti");
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.documenti}>
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <DocumentiViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
