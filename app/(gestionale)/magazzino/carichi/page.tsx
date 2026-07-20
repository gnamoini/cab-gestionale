import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { ReceivingListView } from "@/components/gestionale/magazzino/carichi/receiving-list-view";

export default function MagazzinoCarichiPage() {
  return (
    <PageLayout title="Carichi da DDT">
      <Suspense fallback={<PageTransitionLoader variant="magazzino" />}>
        <ReceivingListView />
      </Suspense>
    </PageLayout>
  );
}
