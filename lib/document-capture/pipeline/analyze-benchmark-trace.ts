import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type AnalyzeTraceSample = {
  traceId?: string | null;
  captureId?: string | null;
  phase: AnalyzeTracePhase;
  durationMs: number;
  elapsedMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type AnalyzePhaseStats = {
  meanMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  count: number;
};

export type AnalyzeBenchmarkSummary = {
  capturedAt: string;
  sampleCount: number;
  runCount: number;
  phases: Record<string, AnalyzePhaseStats>;
  bottlenecks: Array<{ phase: string; meanMs: number; p95Ms: number; sharePct: number }>;
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
      traceId?: string | null;
      captureId?: string | null;
      phase?: AnalyzeTracePhase;
      durationMs?: number;
      elapsedMs?: number;
      inputTokens?: number | null;
      outputTokens?: number | null;
    };
    if (!row.phase || typeof row.durationMs !== "number") return null;
    return {
      traceId: row.traceId ?? null,
      captureId: row.captureId ?? null,
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

function phaseStats(durations: number[]): AnalyzePhaseStats {
  const meanMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  return {
    meanMs,
    maxMs: Math.max(...durations),
    p95Ms: Math.round(percentile(durations, 95)),
    p99Ms: Math.round(percentile(durations, 99)),
    count: durations.length,
  };
}

/** Raggruppa campioni per traceId (una run analyze end-to-end). */
export function groupAnalyzeTraceSamplesByRun(
  samples: AnalyzeTraceSample[],
): Map<string, AnalyzeTraceSample[]> {
  const runs = new Map<string, AnalyzeTraceSample[]>();
  for (const sample of samples) {
    const key = sample.traceId ?? `orphan:${sample.captureId ?? "unknown"}:${sample.elapsedMs}`;
    const bucket = runs.get(key) ?? [];
    bucket.push(sample);
    runs.set(key, bucket);
  }
  return runs;
}

const BOTTLENECK_PHASES: AnalyzeTracePhase[] = [
  "DOWNLOAD_STORAGE_OK",
  "FINALIZE_OK",
  "PARSE_OK",
  "PRELOAD_OK",
  "HYBRID_OK",
  "PDFJS_TEXT_OK",
  "PDF_RENDER_OK",
  "OCR_CROP_OK",
  "OCR_RECOGNIZE_OK",
  "GEMINI_PAYLOAD_OK",
  "GEMINI_RESPONSE",
  "ENTITY_RESOLUTION_OK",
  "DB_PERSIST_OK",
  "UPSERT_FIELDS_OK",
];

export function summarizeAnalyzeTraceSamples(samples: AnalyzeTraceSample[]): AnalyzeBenchmarkSummary {
  const byPhase = new Map<string, number[]>();
  let tokenInput = 0;
  let tokenOutput = 0;
  let tokenCount = 0;
  let firstProgress: number | null = null;
  let firstData: number | null = null;
  let reviewReady: number | null = null;

  const runs = groupAnalyzeTraceSamplesByRun(samples);

  for (const sample of samples) {
    const bucket = byPhase.get(sample.phase) ?? [];
    bucket.push(sample.durationMs);
    byPhase.set(sample.phase, bucket);

    if (
      firstProgress == null &&
      (sample.phase === "DOWNLOAD_STORAGE_OK" || sample.phase === "HYBRID_START" || sample.phase === "UPLOAD_OK")
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
    phases[phase] = phaseStats(durations);
  }

  const endOkStats = phases.END_OK;
  const totalMean = endOkStats?.meanMs ?? 0;
  const bottlenecks = BOTTLENECK_PHASES.map((phase) => {
    const stats = phases[phase];
    if (!stats) return null;
    return {
      phase,
      meanMs: stats.meanMs,
      p95Ms: stats.p95Ms,
      sharePct: totalMean > 0 ? Math.round((stats.meanMs / totalMean) * 1000) / 10 : 0,
    };
  })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.sharePct - a.sharePct);

  return {
    capturedAt: new Date().toISOString(),
    sampleCount: samples.length,
    runCount: runs.size,
    phases,
    bottlenecks,
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
