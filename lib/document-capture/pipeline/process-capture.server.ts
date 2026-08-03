import "server-only";

export {
  runCapturePipeline,
  processDocumentCapture,
  type RunCapturePipelineResult,
} from "@/lib/document-capture/orchestrator/run-capture-pipeline.server";

export type { RunCapturePipelineResult as ProcessDocumentCaptureResult } from "@/lib/document-capture/orchestrator/run-capture-pipeline.server";
