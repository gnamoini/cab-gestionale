import { handleDecisionCenterPatch } from "@/lib/report/decision-center/api/report-decision-center-api.server";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handleDecisionCenterPatch(request, id);
}
