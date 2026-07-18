import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ReceivingListView } from "@/components/gestionale/magazzino/carichi/receiving-list-view";

export default function MagazzinoCarichiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>
      <ReceivingListView />
    </Suspense>
  );
}
