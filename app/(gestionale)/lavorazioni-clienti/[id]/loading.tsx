import { PageLayout } from "@/components/design-system";
import { ClientDetailPageStructure } from "@/components/lavorazioni-clienti/client-lavorazione-detail-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function LavorazioneClienteDetailLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES["client-detail"]}>
      <ClientDetailPageStructure mode="skeleton" />
    </PageLayout>
  );
}
