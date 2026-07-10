import type { PipelineState } from "@/lib/document-capture/model/pipeline-state";
import type { PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";

export function advancePipelineStateForPhase(
  state: PipelineState,
  phase: PipelinePhase,
  success: boolean,
): PipelineState {
  const next = { ...state };
  switch (phase) {
    case "physical_parse":
      break;
    case "ai_extract":
      next.analysis = success ? "completed" : "failed";
      break;
    case "project":
      break;
    case "validate":
      next.validation = success ? "valid" : "blocked";
      break;
    case "interpret":
    case "detect_duplicates":
      break;
    case "plan_apply":
      next.apply = success ? "completed" : "failed";
      break;
    default:
      break;
  }
  return next;
}

export function markUploadUploaded(state: PipelineState): PipelineState {
  return { ...state, upload: "uploaded" };
}
