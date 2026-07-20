import { handleReportExecutiveGet } from "@/lib/report/executive/api/report-executive-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportExecutiveGet(request);
}
