import { PageLayout } from "@/components/design-system";
import { MagazzinoPageStructure } from "@/components/gestionale/magazzino/magazzino-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function MagazzinoLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.magazzino}>
      <MagazzinoPageStructure mode="skeleton" />
    </PageLayout>
  );
}
