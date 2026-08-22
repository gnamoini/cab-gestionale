import { handleAskReportPost } from "@/lib/report/ask-report/api/report-ask-report-api.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAskReportPost(request);
}
