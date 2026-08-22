"use client";

import { useReportAsk } from "@/components/report/ask-report/report-ask-provider";
import { ReportAskPanel } from "@/components/report/ask-report/report-ask-panel";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";

export function ReportAskSection() {
  const { setOpen } = useReportAsk();
  return (
    <div id="bi-ask" data-testid="report-ask-section">
      <ReportAnalysisSectionShell
        title="Chiedi al Report"
        subtitle="Interfaccia conversazionale sopra il BI Center — read-only"
        persistKey="bi-ask"
        defaultCollapsed
      >
        <p className="mb-3 text-sm text-[color:var(--cab-text-muted)]">
          Apri il pannello per fare domande su metriche, insight, contesto operativo e decisioni.
        </p>
        <button
          type="button"
          className="rounded-md bg-[color:var(--cab-accent)] px-4 py-2 text-sm font-medium text-white"
          onClick={() => setOpen(true)}
          data-testid="report-ask-open"
        >
          Apri Chiedi al Report
        </button>
      </ReportAnalysisSectionShell>
      <ReportAskPanel />
    </div>
  );
}
