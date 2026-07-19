import { PageLayout } from "@/components/design-system";
import { ClientiPageStructure } from "@/components/lavorazioni-clienti/client-lavorazioni-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function LavorazioniClientiLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.clienti}>
      <ClientiPageStructure mode="skeleton" />
    </PageLayout>
  );
}
