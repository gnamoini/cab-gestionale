import { handleDecisionCenterGet } from "@/lib/report/decision-center/api/report-decision-center-api.server";

export async function GET(request: Request) {
  return handleDecisionCenterGet(request);
}
