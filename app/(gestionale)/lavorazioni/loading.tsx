import { PageLayout } from "@/components/design-system";
import { LavorazioniPageStructure } from "@/components/gestionale/lavorazioni/lavorazioni-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function LavorazioniLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.lavorazioni}>
      <LavorazioniPageStructure mode="skeleton" />
    </PageLayout>
  );
}
