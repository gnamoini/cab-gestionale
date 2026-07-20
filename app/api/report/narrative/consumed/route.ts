import { handleReportNarrativeConsumedPost } from "@/lib/report/narrative/api/report-narrative-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleReportNarrativeConsumedPost(request);
}
