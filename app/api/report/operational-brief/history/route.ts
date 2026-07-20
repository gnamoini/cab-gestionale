import {
  handleOperationalBriefHistoryGet,
  handleOperationalBriefPdfGet,
} from "@/lib/operational-intelligence/api/report-operational-brief-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/pdf")) {
    return handleOperationalBriefPdfGet(request);
  }
  return handleOperationalBriefHistoryGet(request);
}
