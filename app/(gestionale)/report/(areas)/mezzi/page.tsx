export { reportMezziPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaMezziView } from "@/components/report/areas/report-area-mezzi-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportMezziPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="mezzi">
        <ReportAreaMezziView />
      </ReportAreaPage>
    </PageLayout>
  );
}
