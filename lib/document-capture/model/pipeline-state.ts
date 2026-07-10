/** Composite state machine — COH-01..04. */

export type UploadSubState = "pending" | "uploaded" | "expired";
export type AnalysisSubState = "pending" | "running" | "completed" | "failed";
export type ValidationSubState = "pending" | "valid" | "warning" | "blocked";
export type ApplySubState = "pending" | "running" | "completed" | "failed" | "partial";

export type PipelineState = {
  upload: UploadSubState;
  analysis: AnalysisSubState;
  validation: ValidationSubState;
  apply: ApplySubState;
};

export const INITIAL_PIPELINE_STATE: PipelineState = {
  upload: "pending",
  analysis: "pending",
  validation: "pending",
  apply: "pending",
};
