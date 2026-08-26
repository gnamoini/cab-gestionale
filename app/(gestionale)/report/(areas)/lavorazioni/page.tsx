export { reportLavorazioniPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { PageLayout } from "@/components/design-system";
import { ReportAreaLavorazioniView } from "@/components/report/areas/report-area-lavorazioni-view";
import { ReportAreaPage } from "@/components/report/report-area-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function ReportLavorazioniPage() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.report}>
      <ReportAreaPage areaId="lavorazioni">
        <ReportAreaLavorazioniView />
      </ReportAreaPage>
    </PageLayout>
  );
}
