export { reportPreventiviPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaPreventiviViewLazy } from "@/components/report/lazy-report-area-views";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportPreventiviPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="preventivi">
        <ReportAreaPreventiviViewLazy />
      </ReportAreaPage>
    </PageLayout>
  );
}
