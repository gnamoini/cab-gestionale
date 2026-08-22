import { handleDecisionCenterGeneratePost } from "@/lib/report/decision-center/api/report-decision-center-generate-api.server";

export async function POST(request: Request) {
  return handleDecisionCenterGeneratePost(request);
}
