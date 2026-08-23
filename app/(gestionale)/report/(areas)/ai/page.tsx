import { PageLayout } from "@/components/design-system";
import { ReportAreaAiView } from "@/components/report/areas/report-area-ai-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportAiPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="ai" showAskButton>
        <ReportAreaAiView />
      </ReportAreaPage>
    </PageLayout>
  );
}
