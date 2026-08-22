import { handleOperationalContextGet } from "@/lib/report/operational-context/api/report-operational-context-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleOperationalContextGet(request);
}
