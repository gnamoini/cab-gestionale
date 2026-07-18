import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ReceivingWizard } from "@/components/gestionale/magazzino/carichi/receiving-wizard";

export default function MagazzinoCarichiNuovoPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>
      <ReceivingWizard />
    </Suspense>
  );
}
