"use client";

import dynamic from "next/dynamic";

const ReportEconomiaSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportEconomiaSection),
);
const ReportLavorazioniBiSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportLavorazioniBiSection),
);
const ReportPreventiviSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportPreventiviSection),
);
const ReportMagazzinoBiSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportMagazzinoBiSection),
);
const ReportClientiSection = dynamic(() =>
  import("@/components/report/bi-center/report-clienti-section").then((m) => m.ReportClientiSection),
);
const ReportRisorseSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportRisorseSection),
);
const ReportHistoricalTrendSection = dynamic(() =>
  import("@/components/report/bi-center/report-historical-trend-section").then((m) => m.ReportHistoricalTrendSection),
);
const ReportTimelineV2 = dynamic(() =>
  import("@/components/report/bi-center/operational/report-timeline-v2").then((m) => m.ReportTimelineV2),
);
const BusinessReportShell = dynamic(() =>
  import("@/components/report/business-report/business-report-shell").then((m) => m.BusinessReportShell),
);

export function ReportBiCenterShell() {
  return (
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ReportEconomiaSection />
        <ReportLavorazioniBiSection />
        <ReportPreventiviSection />
        <ReportMagazzinoBiSection />
        <ReportClientiSection />
        <ReportRisorseSection />
      </div>
      <ReportHistoricalTrendSection />
      <ReportTimelineV2 />
      <BusinessReportShell />
    </div>
  );
}
