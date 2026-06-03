"use client";

import { KpiPerformanceBarChart } from "@/components/report/kpi-performance/kpi-performance-bar-chart";
import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import type { KpiPerformanceOperational } from "@/lib/report/kpi-performance/kpi-performance-types";

export function KpiPerformanceOperational({ data }: { data: KpiPerformanceOperational }) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Interventi chiusi per mese</h3>
        <p className={`mt-1 ${reportSectionGroupDescClass}`}>Completate archiviate nel filtro periodo.</p>
        <div className="mt-3">
          <KpiPerformanceBarChart points={data.monthlyClosed} ariaLabel="Interventi chiusi per mese" />
        </div>
      </div>
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Guasti euristici per mese</h3>
        <p className={`mt-1 ${reportSectionGroupDescClass}`}>
          Conteggio da testo note/stato (non campo guasto strutturato).
        </p>
        <div className="mt-3">
          <KpiPerformanceBarChart
            points={data.heuristicFaultsMonthly}
            ariaLabel="Guasti euristici per mese"
            barClassName="fill-[color:var(--cab-danger)]"
          />
        </div>
      </div>
    </div>
  );
}
