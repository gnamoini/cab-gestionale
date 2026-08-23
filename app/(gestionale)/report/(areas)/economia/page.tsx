import { PageLayout } from "@/components/design-system";
import { ReportAreaEconomiaView } from "@/components/report/areas/report-area-economia-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportEconomiaPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="economia">
        <ReportAreaEconomiaView />
      </ReportAreaPage>
    </PageLayout>
  );
}
