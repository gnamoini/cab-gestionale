import { PageLayout } from "@/components/design-system";
import { ImpostazioniPageStructure } from "@/components/dashboard/impostazioni-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ImpostazioniLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.impostazioni}>
      <ImpostazioniPageStructure mode="skeleton" />
    </PageLayout>
  );
}
