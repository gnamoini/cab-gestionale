"use client";

import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { useOptionalReportAsk } from "@/components/report/ask-report/report-ask-provider";

export function ReportAskToolbarButton() {
  const ask = useOptionalReportAsk();
  if (!ask) return null;
  return (
    <GestionaleAiActionButton
      variant="secondary"
      size="sm"
      iconOnly
      className="shrink-0"
      onClick={() => ask.setOpen(true)}
      data-testid="report-ask-toolbar-button"
      aria-label="Chiedi al Report"
    >
      Chiedi al Report
    </GestionaleAiActionButton>
  );
}
