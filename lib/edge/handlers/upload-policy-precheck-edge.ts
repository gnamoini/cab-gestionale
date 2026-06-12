import {
  validateUploadPolicyBody,
  type UploadPolicyBody,
} from "@/lib/edge/validators/upload-policy-schema";
import type { EdgeHandlerResult } from "@/lib/edge/edge-types";

export async function runUploadPolicyPrecheckEdge(request: Request): Promise<EdgeHandlerResult> {
  let body: UploadPolicyBody;
  try {
    const clone = request.clone();
    body = (await clone.json()) as UploadPolicyBody;
  } catch {
    return {
      outcome: "handled",
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Body JSON non valido" }),
      latencySavedEstimate: 20,
    };
  }

  const validation = validateUploadPolicyBody(body);
  if (!validation.ok) {
    return {
      outcome: "handled",
      status: validation.status,
      contentType: "application/json",
      body: JSON.stringify({ error: validation.error }),
      latencySavedEstimate: 20,
    };
  }

  return {
    outcome: "fallback",
    reason: "needs_server_rbac",
  };
}
