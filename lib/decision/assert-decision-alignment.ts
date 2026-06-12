import { requestContextFingerprint, type RequestContext } from "@/lib/decision/request-context";
import { recordDecisionMismatch } from "@/lib/observability/request-decision-audit";

export function recordDecisionAlignment(input: {
  ctx: RequestContext;
  decisionKind: "cache" | "delivery" | "route";
  serverValue: string;
  edgeHint?: string | null;
}): void {
  const edgeHint = input.edgeHint?.trim();
  if (!edgeHint) return;

  if (edgeHint !== input.serverValue) {
    recordDecisionMismatch({
      decisionKind: input.decisionKind,
      route: input.ctx.route,
      method: input.ctx.method,
      runtimeSource: input.ctx.runtimeSource,
      edgeHint,
      serverValue: input.serverValue,
      ctxFingerprint: requestContextFingerprint(input.ctx),
    });
  }
}
