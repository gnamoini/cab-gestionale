"use client";

import { KpiPerformanceBarChart } from "@/components/report/kpi-performance/kpi-performance-bar-chart";
import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import type { KpiPerformanceOperational } from "@/lib/report/kpi-performance/kpi-performance-types";

function scrollToClientiMezzi() {
  const el = document.getElementById("report-section-clienti_mezzi");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const shell = el.querySelector<HTMLButtonElement>("button[data-shell-toggle]");
  shell?.click();
}

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
        <h3 className={reportSubsectionTitleClass}>Guasti euristici</h3>
        <p className={`mt-1 ${reportSectionGroupDescClass}`}>
          Trend guasti e composizione per tipo sono nella sezione{" "}
          <button
            type="button"
            className="font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
            onClick={scrollToClientiMezzi}
          >
            CLIENTI E MEZZI
          </button>
          .
        </p>
      </div>
    </div>
  );
}
