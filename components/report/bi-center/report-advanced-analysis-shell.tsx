"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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
const ReportCrossDomainSection = dynamic(() =>
  import("@/components/report/bi-center/advanced/report-cross-domain-section").then(
    (m) => m.ReportCrossDomainSection,
  ),
);
const ReportCrossMetricsSection = dynamic(() =>
  import("@/components/report/bi-center/advanced/report-cross-metrics-section").then(
    (m) => m.ReportCrossMetricsSection,
  ),
);
const ReportCrossCatenaSection = dynamic(() =>
  import("@/components/report/bi-center/advanced/report-cross-catena-section").then(
    (m) => m.ReportCrossCatenaSection,
  ),
);
const ReportCrossTrendSection = dynamic(() =>
  import("@/components/report/bi-center/advanced/report-cross-trend-section").then(
    (m) => m.ReportCrossTrendSection,
  ),
);

function AdvancedGrid() {
  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <ReportEconomiaSection />
        <ReportPreventiviSection />
        <ReportClientiSection />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <ReportLavorazioniBiSection />
        <ReportMagazzinoBiSection />
        <ReportRisorseSection />
      </div>
      <div className="col-span-1 w-full self-start xl:col-span-2">
        <ReportCrossMetricsSection />
        <div className="mt-4">
          <ReportCrossDomainSection />
        </div>
        <div className="mt-4 space-y-4">
          <ReportCrossCatenaSection />
          <ReportCrossTrendSection />
        </div>
      </div>
    </div>
  );
}

/** Desktop: visible collapsible domains. Mobile: collapsed shell. */
export function ReportAdvancedAnalysisShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div id="bi-advanced" className="min-w-0">
      <div className="hidden md:block">
        <h2 className="mb-3 text-base font-semibold text-[color:var(--cab-text)]">Analisi avanzate</h2>
        <AdvancedGrid />
      </div>
      <div className="md:hidden">
        {!mobileOpen ? (
          <button
            type="button"
            className="w-full rounded-lg border border-[color:var(--cab-border)] px-4 py-3 text-left text-sm font-medium"
            onClick={() => setMobileOpen(true)}
            data-testid="report-advanced-expand"
          >
            Apri analisi avanzate
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Analisi avanzate</h2>
            <AdvancedGrid />
          </div>
        )}
      </div>
    </div>
  );
}
