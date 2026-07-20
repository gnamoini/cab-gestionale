import { handleReportNarrativeGet } from "@/lib/report/narrative/api/report-narrative-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportNarrativeGet(request);
}
