export { reportMagazzinoPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaMagazzinoView } from "@/components/report/areas/report-area-magazzino-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportMagazzinoPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="magazzino">
        <ReportAreaMagazzinoView />
      </ReportAreaPage>
    </PageLayout>
  );
}
