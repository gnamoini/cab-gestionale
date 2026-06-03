"use client";

import dynamic from "next/dynamic";

const ReportAnalyticsView = dynamic(
  () => import("@/components/report/report-analytics-view").then((m) => m.ReportAnalyticsView),
  { ssr: false },
);

export function ReportView() {
  return <ReportAnalyticsView />;
}
