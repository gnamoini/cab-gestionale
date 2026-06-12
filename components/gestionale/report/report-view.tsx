"use client";

import dynamic from "next/dynamic";
import { useReportPdfWarmup } from "@/lib/observability/asset-cache-warmup";

const ReportAnalyticsView = dynamic(
  () => import("@/components/report/report-analytics-view").then((m) => m.ReportAnalyticsView),
);

export function ReportView() {
  useReportPdfWarmup();
  return <ReportAnalyticsView />;
}
