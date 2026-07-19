import { PageLayout } from "@/components/design-system";
import { DipendentiPageStructure } from "@/components/gestionale/dipendenti/dipendenti-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function DipendentiLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.dipendenti}>
      <DipendentiPageStructure mode="skeleton" />
    </PageLayout>
  );
}
