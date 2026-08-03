/** SSOT — bump on every deploy that changes pipeline phases or behavior. */
export const CAPTURE_PIPELINE_VERSION = "v4.2" as const;

export type CapturePipelineVersion = typeof CAPTURE_PIPELINE_VERSION;

export const CAPTURE_PIPELINE_VERSION_HEADER = "x-capture-pipeline-version";

export function readCapturePipelineVersionHeader(request: Request): string | null {
  return request.headers.get(CAPTURE_PIPELINE_VERSION_HEADER)?.trim() || null;
}

export function buildPipelineIdempotencySuffix(input: {
  pipelineVersion: string;
  captureVersion: number;
}): string {
  return `pv${input.pipelineVersion}:cv${input.captureVersion}`;
}
