import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AnalyzeTracePhase =
  | "START"
  | "PREREQUISITES_START"
  | "PREREQUISITES_OK"
  | "PREREQUISITES_FAIL"
  | "DOWNLOAD_STORAGE_START"
  | "DOWNLOAD_STORAGE_OK"
  | "DOWNLOAD_STORAGE_FAIL"
  | "HYBRID_START"
  | "HYBRID_OK"
  | "HYBRID_SKIP"
  | "HYBRID_FAIL"
  | "GEMINI_REQUEST"
  | "GEMINI_RESPONSE"
  | "GEMINI_FAIL"
  | "PARSE_START"
  | "PARSE_OK"
  | "PARSE_FAIL"
  | "UPSERT_FIELDS_START"
  | "UPSERT_FIELDS_OK"
  | "UPSERT_FIELDS_FAIL"
  | "END_OK"
  | "END_FAIL";

export type AnalyzeTraceOutcome = "ok" | "fail" | "skip";

export type AnalyzeTraceContext = {
  traceId: string;
  correlationId?: string;
  captureId: string;
  companyId?: string | null;
  pipelineVersion: "v4.1" | "legacy";
  retryCount?: number;
};

export type AnalyzeTraceEventPayload = {
  companyId?: string | null;
  fileMime?: string;
  fileSize?: number;
  storagePath?: string;
  providerModel?: string;
  providerKeyId?: string | null;
  providerKeySlot?: string | null;
  retryAttempt?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  fieldCount?: number;
  durationMs?: number;
  errorCode?: string;
  errorType?: string;
  detail?: string;
  stack?: string;
};

let cachedSdkVersion: string | null = null;

export function readAnalyzeSdkVersion(): string {
  if (cachedSdkVersion) return cachedSdkVersion;
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const ai = pkg.dependencies?.ai ?? "?";
    const google = pkg.dependencies?.["@ai-sdk/google"] ?? "?";
    cachedSdkVersion = `ai@${ai},@ai-sdk/google@${google}`;
    return cachedSdkVersion;
  } catch {
    cachedSdkVersion = "unknown";
    return cachedSdkVersion;
  }
}

export class AnalyzeTrace {
  private readonly startedAt = performance.now();
  private lastPhaseAt = this.startedAt;
  private lastPhase: AnalyzeTracePhase = "START";

  constructor(private readonly ctx: AnalyzeTraceContext) {}

  get traceId(): string {
    return this.ctx.traceId;
  }

  setRetry(retryAttempt: number, retryCount: number): void {
    this.ctx.retryCount = retryCount;
    this.emit("GEMINI_REQUEST", "ok", { retryAttempt });
  }

  setProviderMeta(meta: {
    providerModel?: string;
    providerKeyId?: string | null;
    providerKeySlot?: string | null;
  }): void {
    this.lastProviderMeta = meta;
  }

  private lastProviderMeta: {
    providerModel?: string;
    providerKeyId?: string | null;
    providerKeySlot?: string | null;
  } = {};

  emit(phase: AnalyzeTracePhase, outcome: AnalyzeTraceOutcome, payload: AnalyzeTraceEventPayload = {}): void {
    const now = performance.now();
    const durationMs = Math.round(now - this.lastPhaseAt);
    const elapsedMs = Math.round(now - this.startedAt);
    this.lastPhaseAt = now;
    this.lastPhase = phase;

    const line = JSON.stringify({
      event: "DOCUMENT_CAPTURE_ANALYZE_TRACE",
      phase,
      outcome,
      durationMs,
      elapsedMs,
      traceId: this.ctx.traceId,
      correlationId: this.ctx.correlationId ?? null,
      captureId: this.ctx.captureId,
      companyId: this.ctx.companyId ?? null,
      pipelineVersion: this.ctx.pipelineVersion,
      retryCount: this.ctx.retryCount ?? null,
      sdkVersion: readAnalyzeSdkVersion(),
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      providerModel: payload.providerModel ?? this.lastProviderMeta.providerModel ?? null,
      providerKeyId: payload.providerKeyId ?? this.lastProviderMeta.providerKeyId ?? null,
      providerKeySlot: payload.providerKeySlot ?? this.lastProviderMeta.providerKeySlot ?? null,
      retryAttempt: payload.retryAttempt ?? null,
      fileMime: payload.fileMime ?? null,
      fileSize: payload.fileSize ?? null,
      storagePath: payload.storagePath ?? null,
      inputTokens: payload.inputTokens ?? null,
      outputTokens: payload.outputTokens ?? null,
      totalTokens: payload.totalTokens ?? null,
      fieldCount: payload.fieldCount ?? null,
      errorCode: payload.errorCode ?? null,
      errorType: payload.errorType ?? null,
      detail: payload.detail ?? null,
      stack: payload.stack ?? null,
    });

    console.info(line);
  }

  fail(phase: AnalyzeTracePhase, error: unknown, extra: AnalyzeTraceEventPayload = {}): void {
    const detail = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const errorType = error instanceof Error ? error.name : typeof error;
    this.emit(phase, "fail", { ...extra, detail, stack, errorType });
  }

  lastRecordedPhase(): AnalyzeTracePhase {
    return this.lastPhase;
  }
}

export function createAnalyzeTrace(input: Omit<AnalyzeTraceContext, "traceId"> & { traceId?: string }): AnalyzeTrace {
  return new AnalyzeTrace({
    ...input,
    traceId: input.traceId ?? crypto.randomUUID(),
  });
}
