import { PageLayout } from "@/components/design-system";
import { ReportPageStructure } from "@/components/report/report-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportPageStructure mode="skeleton" />
    </PageLayout>
  );
}
