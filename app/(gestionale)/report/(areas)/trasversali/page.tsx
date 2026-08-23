import { PageLayout } from "@/components/design-system";
import { ReportAreaTrasversaliView } from "@/components/report/areas/report-area-trasversali-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportTrasversaliPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="trasversali">
        <ReportAreaTrasversaliView />
      </ReportAreaPage>
    </PageLayout>
  );
}
