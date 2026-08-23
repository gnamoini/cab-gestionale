import { PageLayout } from "@/components/design-system";
import { ReportAreaPreventiviView } from "@/components/report/areas/report-area-preventivi-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportPreventiviPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="preventivi">
        <ReportAreaPreventiviView />
      </ReportAreaPage>
    </PageLayout>
  );
}
