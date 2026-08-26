export { reportClientiPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaClientiView } from "@/components/report/areas/report-area-clienti-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportClientiPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="clienti">
        <ReportAreaClientiView />
      </ReportAreaPage>
    </PageLayout>
  );
}
