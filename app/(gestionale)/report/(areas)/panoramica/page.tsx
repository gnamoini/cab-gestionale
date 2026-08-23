import { PageLayout } from "@/components/design-system";
import { ReportAreaPanoramicaView } from "@/components/report/areas/report-area-panoramica-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportPanoramicaPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="panoramica">
        <ReportAreaPanoramicaView />
      </ReportAreaPage>
    </PageLayout>
  );
}
