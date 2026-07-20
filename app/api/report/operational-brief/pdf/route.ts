import { handleOperationalBriefPdfGet } from "@/lib/operational-intelligence/api/report-operational-brief-api";

export async function GET(request: Request) {
  return handleOperationalBriefPdfGet(request);
}
