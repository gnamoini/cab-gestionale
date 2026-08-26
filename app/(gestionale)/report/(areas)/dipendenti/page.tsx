export { reportDipendentiPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaDipendentiView } from "@/components/report/areas/report-area-dipendenti-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportDipendentiPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="dipendenti">
        <ReportAreaDipendentiView />
      </ReportAreaPage>
    </PageLayout>
  );
}
