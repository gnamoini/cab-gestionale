export { impostazioniAiProvidersPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { AiProvidersSettingsPageLazy } from "@/components/gestionale/lazy-route-views";

export default function AiProvidersPage() {
  return <AiProvidersSettingsPageLazy />;
}
