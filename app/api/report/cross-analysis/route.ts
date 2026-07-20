import { handleReportCrossAnalysisGet } from "@/lib/report/cross-analysis/api/report-cross-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportCrossAnalysisGet(request);
}
