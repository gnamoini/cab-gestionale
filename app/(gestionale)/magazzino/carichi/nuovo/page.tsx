export { magazzinoCarichiNuovoPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { ReceivingWizard } from "@/components/gestionale/magazzino/carichi/receiving-wizard";

/** ponytail: wizard multi-step — header per step in view, non PageLayout shell. */
export default function MagazzinoCarichiNuovoPage() {
  return <ReceivingWizard />;
}
