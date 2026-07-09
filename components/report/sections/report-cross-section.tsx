"use client";

import { useMemo } from "react";
import { useReportAnalyticsDerived } from "@/components/report/report-analytics-derived-context";
import { ReportDomainMetricsGrid } from "@/components/report/report-domain-metrics-grid";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { buildCrossAnalytics } from "@/lib/report/report-domain-analytics";
import { reportSectionGroupDescClass } from "@/components/report/report-ui-tokens";

export default function ReportCrossSectionView(_props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();

  const crossDto = useMemo(
    () => buildCrossAnalytics(derived),
    [derived.revision, derived.operational, derived.warehouse, derived.labor, derived.economic],
  );

  return (
    <div className="min-w-0 space-y-4">
      <p className={reportSectionGroupDescClass}>
        Indicatori calcolati dai dati già caricati nelle sezioni di dominio. Apri le sezioni
        correlate se vedi N/D.
      </p>
      <ReportDomainMetricsGrid metrics={crossDto.metrics} />
    </div>
  );
}
