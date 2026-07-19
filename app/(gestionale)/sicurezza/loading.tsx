import { PageLayout } from "@/components/design-system";
import { SicurezzaPageStructure } from "@/components/dashboard/sicurezza-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function SicurezzaLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.sicurezza}>
      <SicurezzaPageStructure mode="skeleton" />
    </PageLayout>
  );
}
