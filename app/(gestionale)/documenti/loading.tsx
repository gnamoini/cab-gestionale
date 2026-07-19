import { PageLayout } from "@/components/design-system";
import { DocumentiPageStructure } from "@/components/gestionale/documenti/documenti-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function DocumentiLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.documenti}>
      <DocumentiPageStructure mode="skeleton" />
    </PageLayout>
  );
}
