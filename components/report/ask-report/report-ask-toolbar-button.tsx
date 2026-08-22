"use client";

import { useOptionalReportAsk } from "@/components/report/ask-report/report-ask-provider";

export function ReportAskToolbarButton() {
  const ask = useOptionalReportAsk();
  if (!ask) return null;
  return (
    <button
      type="button"
      className="rounded-md border border-[color:var(--cab-border)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--cab-surface-muted)]"
      onClick={() => ask.setOpen(true)}
      data-testid="report-ask-toolbar-button"
    >
      Chiedi al Report
    </button>
  );
}
