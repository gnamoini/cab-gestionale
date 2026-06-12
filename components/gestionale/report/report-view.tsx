"use client";

import dynamic from "next/dynamic";
import { LoadingReportSkeleton } from "@/components/design-system";
import { useReportPdfWarmup } from "@/lib/observability/asset-cache-warmup";

const ReportAnalyticsView = dynamic(
  () => import("@/components/report/report-analytics-view").then((m) => m.ReportAnalyticsView),
  { loading: () => <LoadingReportSkeleton /> },
);

export function ReportView() {
  useReportPdfWarmup();
  return <ReportAnalyticsView />;
}
