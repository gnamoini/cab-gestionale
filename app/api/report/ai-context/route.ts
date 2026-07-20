import { handleReportAiContextGet } from "@/lib/report/ai-context/api/report-ai-context-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportAiContextGet(request);
}
