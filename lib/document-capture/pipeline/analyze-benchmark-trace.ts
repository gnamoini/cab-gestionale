import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type AnalyzeTraceSample = {
  phase: AnalyzeTracePhase;
  durationMs: number;
  elapsedMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type AnalyzeBenchmarkSummary = {
  capturedAt: string;
  sampleCount: number;
  phases: Record<string, { meanMs: number; maxMs: number; p95Ms: number }>;
  tokens: { meanInput: number; meanOutput: number } | null;
  uxMetrics: {
    timeToFirstProgressMs: number | null;
    timeToFirstDataMs: number | null;
    timeToReviewReadyMs: number | null;
  };
};

export function parseAnalyzeTraceLogLine(line: string): AnalyzeTraceSample | null {
  const trimmed = line.trim();
  if (!trimmed.includes("DOCUMENT_CAPTURE_ANALYZE_TRACE")) return null;
  try {
    const row = JSON.parse(trimmed) as {
      phase?: AnalyzeTracePhase;
      durationMs?: number;
      elapsedMs?: number;
      inputTokens?: number | null;
      outputTokens?: number | null;
    };
    if (!row.phase || typeof row.durationMs !== "number") return null;
    return {
      phase: row.phase,
      durationMs: row.durationMs,
      elapsedMs: typeof row.elapsedMs === "number" ? row.elapsedMs : row.durationMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
    };
  } catch {
    return null;
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

export function summarizeAnalyzeTraceSamples(samples: AnalyzeTraceSample[]): AnalyzeBenchmarkSummary {
  const byPhase = new Map<string, number[]>();
  let tokenInput = 0;
  let tokenOutput = 0;
  let tokenCount = 0;
  let firstProgress: number | null = null;
  let firstData: number | null = null;
  let reviewReady: number | null = null;

  for (const sample of samples) {
    const bucket = byPhase.get(sample.phase) ?? [];
    bucket.push(sample.durationMs);
    byPhase.set(sample.phase, bucket);

    if (
      firstProgress == null &&
      (sample.phase === "DOWNLOAD_STORAGE_OK" || sample.phase === "HYBRID_START")
    ) {
      firstProgress = sample.elapsedMs;
    }
    if (firstData == null && sample.phase === "PARSE_OK") {
      firstData = sample.elapsedMs;
    }
    if (sample.phase === "END_OK") {
      reviewReady = sample.elapsedMs;
    }
    if (sample.inputTokens != null && sample.outputTokens != null) {
      tokenInput += sample.inputTokens;
      tokenOutput += sample.outputTokens;
      tokenCount += 1;
    }
  }

  const phases: AnalyzeBenchmarkSummary["phases"] = {};
  for (const [phase, durations] of byPhase) {
    const meanMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    phases[phase] = {
      meanMs,
      maxMs: Math.max(...durations),
      p95Ms: Math.round(percentile(durations, 95)),
    };
  }

  return {
    capturedAt: new Date().toISOString(),
    sampleCount: samples.length,
    phases,
    tokens:
      tokenCount > 0
        ? { meanInput: Math.round(tokenInput / tokenCount), meanOutput: Math.round(tokenOutput / tokenCount) }
        : null,
    uxMetrics: {
      timeToFirstProgressMs: firstProgress,
      timeToFirstDataMs: firstData,
      timeToReviewReadyMs: reviewReady,
    },
  };
}
