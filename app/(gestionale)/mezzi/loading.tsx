import { PageLayout } from "@/components/design-system";
import { MezziPageStructure } from "@/components/gestionale/mezzi/mezzi-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function MezziLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.mezzi}>
      <MezziPageStructure mode="skeleton" />
    </PageLayout>
  );
}
