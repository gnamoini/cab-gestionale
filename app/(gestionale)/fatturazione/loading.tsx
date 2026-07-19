import { PageLayout } from "@/components/design-system";
import { FatturazionePageStructure } from "@/components/fatturazione/fatturazione-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function FatturazioneLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.fatturazione}>
      <FatturazionePageStructure mode="skeleton" />
    </PageLayout>
  );
}
