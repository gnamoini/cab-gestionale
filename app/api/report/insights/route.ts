import { handleReportInsightsGet } from "@/lib/report/insights/api/report-insights-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportInsightsGet(request);
}
