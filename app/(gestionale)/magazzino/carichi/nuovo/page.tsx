import { Suspense } from "react";
import { PageTransitionLoader } from "@/components/design-system";
import { ReceivingWizard } from "@/components/gestionale/magazzino/carichi/receiving-wizard";

/** ponytail: wizard multi-step — header per step in view, non PageLayout shell. */
export default function MagazzinoCarichiNuovoPage() {
  return (
    <Suspense fallback={<PageTransitionLoader variant="magazzino" />}>
      <ReceivingWizard />
    </Suspense>
  );
}
