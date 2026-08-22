import { handleReportAnalyticsGet, handleReportAnalyticsPost } from "@/lib/report/analytics-engine/api/report-analytics-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportAnalyticsGet(request);
}

export async function POST(request: Request) {
  return handleReportAnalyticsPost(request);
}
