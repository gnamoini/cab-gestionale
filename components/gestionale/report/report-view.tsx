"use client";

import { ReportHubView } from "@/components/report/report-hub-view";
import { useReportPdfWarmup } from "@/lib/observability/use-deferred-pdf-warmup";

export function ReportView() {
  useReportPdfWarmup();
  return <ReportHubView />;
}
