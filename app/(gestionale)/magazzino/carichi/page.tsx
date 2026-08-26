export { magazzinoCarichiPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { ReceivingListView } from "@/components/gestionale/magazzino/carichi/receiving-list-view";
import { fetchInventoryReceivingDocumentsServer } from "@/lib/inventory-receiving/inventory-receiving-list-fetch.server";
import { inventoryReceivingListQueryKey } from "@/lib/inventory-receiving/inventory-receiving-list-query-keys";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { createServerQueryClient } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function MagazzinoCarichiPage() {
  const qc = createServerQueryClient();
  const res = await fetchInventoryReceivingDocumentsServer();
  if (res.success && res.data) {
    qc.setQueryData(inventoryReceivingListQueryKey(), res.data);
  }
  return (
    <PageLayout title="Carichi da DDT">
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <ReceivingListView />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
