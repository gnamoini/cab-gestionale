import { PageLayout } from "@/components/design-system";
import { PreventiviPageStructure } from "@/components/preventivi/preventivi-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function PreventiviLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.preventivi}>
      <PreventiviPageStructure mode="skeleton" />
    </PageLayout>
  );
}
