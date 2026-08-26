export { identificaRicambioPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { IdentificaRicambioViewLazy } from "@/components/gestionale/lazy-route-views";

export default function IdentificaRicambioPage() {
  return (
    <PageLayout title="Identifica ricambio">
      <IdentificaRicambioViewLazy />
    </PageLayout>
  );
}
