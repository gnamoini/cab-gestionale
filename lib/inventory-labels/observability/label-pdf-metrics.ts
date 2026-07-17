export type LabelPdfMetricsPayload = {
  labelCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  durationMs: number;
  outcome: "ok" | "failed";
  errorCode?: string;
  pipeline?: string;
  mode?: "sync" | "async";
};

export function buildLabelPdfMetricsPayload(
  input: LabelPdfMetricsPayload,
): Record<string, unknown> {
  return {
    labelCount: input.labelCount,
    cacheHitCount: input.cacheHitCount,
    cacheMissCount: input.cacheMissCount,
    durationMs: input.durationMs,
    outcome: input.outcome,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.pipeline ? { pipeline: input.pipeline } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
  };
}
