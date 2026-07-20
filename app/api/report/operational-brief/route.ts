import { handleOperationalBriefGet } from "@/lib/operational-intelligence/api/report-operational-brief-api";

export async function GET(request: Request) {
  return handleOperationalBriefGet(request);
}
