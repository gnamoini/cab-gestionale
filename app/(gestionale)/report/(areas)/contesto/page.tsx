import { PageLayout } from "@/components/design-system";
import { ReportAreaContestoView } from "@/components/report/areas/report-area-contesto-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportContestoPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="contesto">
        <ReportAreaContestoView />
      </ReportAreaPage>
    </PageLayout>
  );
}
