import { PageLayout } from "@/components/design-system";
import { ReceivingListView } from "@/components/gestionale/magazzino/carichi/receiving-list-view";

export default function MagazzinoCarichiPage() {
  return (
    <PageLayout title="Carichi da DDT">
      <ReceivingListView />
    </PageLayout>
  );
}
