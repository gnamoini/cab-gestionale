export { magazzinoCarichiNuovoPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { ReceivingWizardLazy } from "@/components/gestionale/lazy-route-views";

/** ponytail: wizard multi-step — header per step in view, non PageLayout shell. */
export default function MagazzinoCarichiNuovoPage() {
  return <ReceivingWizardLazy />;
}
