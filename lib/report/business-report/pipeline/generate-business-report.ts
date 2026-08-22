import "server-only";

import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { BusinessReportType } from "@/lib/report/business-report/types";
import {
  buildBusinessReportContext,
  type BusinessReportRuntimeContext,
} from "@/lib/report/business-report/context/build-business-report-context";
import { generateBusinessReportAi } from "@/lib/report/business-report/ai/generate-business-report-ai";
import {
  buildIdempotencyKey,
  buildLogicalReportKey,
} from "@/lib/report/business-report/idempotency/report-run-keys";
import { resolveGenerateAttempt } from "@/lib/report/business-report/idempotency/resolve-generate-attempt";
import {
  mergeBusinessReport,
  newReportRunId,
} from "@/lib/report/business-report/merge/merge-business-report";
import {
  beginReportRun,
  completeReportRun,
  failReportRun,
  findGeneratingRun,
  findLatestCompletedRun,
  findLatestRunForLogicalKey,
  getMaxGenerationVersion,
  reactivateReportRun,
} from "@/lib/report/business-report/storage/report-run-storage.server";
import { validateBusinessReportAiOutput } from "@/lib/report/business-report/validation/validate-business-report-quality";
import { businessReportSchema } from "@/lib/report/business-report/schema/business-report-schema";
import { logBusinessReportObservability } from "@/lib/report/business-report/observability/log-business-report.server";

export type GenerateBusinessReportInput = {
  reportType: BusinessReportType;
  period: ReportRequestedPeriod;
  regenerate?: boolean;
  useServiceRole?: boolean;
  allowDeterministicFallback?: boolean;
};

export type GenerateBusinessReportResult =
  | { ok: true; report: ReturnType<typeof mergeBusinessReport>; cached: boolean; runId: string; ephemeral?: boolean }
  | { ok: false; code: string; message: string; runId?: string };

const PUBLISH_DETERMINISTIC_FALLBACK = true;

function toRunSnapshot(row: { id: string; status: string; generation_version: number; generated_at: string }) {
  return {
    id: row.id,
    status: row.status as "generating" | "completed" | "failed",
    generationVersion: row.generation_version,
    generatedAt: row.generated_at,
  };
}

export async function generateBusinessReport(
  input: GenerateBusinessReportInput,
  signal?: AbortSignal,
): Promise<GenerateBusinessReportResult> {
  const started = Date.now();
  const periodStart = input.period.start!;
  const periodEnd = input.period.end!;
  const compareMode = input.period.compareMode;

  const logicalReportKey = buildLogicalReportKey({
    reportType: input.reportType,
    periodStart,
    periodEnd,
    compareMode,
  });

  const [completed, generating, latest, maxVersion] = await Promise.all([
    findLatestCompletedRun(logicalReportKey, input.useServiceRole),
    findGeneratingRun(logicalReportKey, input.useServiceRole),
    findLatestRunForLogicalKey(logicalReportKey, input.useServiceRole),
    getMaxGenerationVersion(logicalReportKey, input.useServiceRole),
  ]);

  const attempt = resolveGenerateAttempt({
    regenerate: Boolean(input.regenerate),
    hasCompleted: Boolean(!input.regenerate && completed?.content),
    generating: generating ? toRunSnapshot(generating) : null,
    latestRun: latest ? toRunSnapshot(latest) : null,
    maxGenerationVersion: maxVersion,
  });

  if (attempt.action === "cache" && completed?.content) {
    return { ok: true, report: completed.content, cached: true, runId: completed.id };
  }

  if (attempt.action === "already_running") {
    return {
      ok: false,
      code: "already_running",
      message: "Report generation in progress",
      runId: attempt.runId,
    };
  }

  let runId: string;
  let generationVersion: number;
  let ephemeral = false;

  if (attempt.action === "reactivate") {
    if (attempt.reason === "stale_generating") {
      await failReportRun({
        runId: attempt.runId,
        error: "stale_generating",
        useServiceRole: input.useServiceRole,
      });
    }
    const reactivated = await reactivateReportRun({
      runId: attempt.runId,
      useServiceRole: input.useServiceRole,
    });
    if (!reactivated) {
      return { ok: false, code: "reactivate_failed", message: "Could not retry report run" };
    }
    runId = attempt.runId;
    generationVersion = attempt.generationVersion;
  } else if (attempt.action === "insert") {
    generationVersion = attempt.generationVersion;
    runId = newReportRunId();
    const idempotencyKey = buildIdempotencyKey({
      reportType: input.reportType,
      periodStart,
      periodEnd,
      compareMode,
      generationVersion,
    });

    const begin = await beginReportRun({
      runId,
      logicalReportKey,
      generationVersion,
      idempotencyKey,
      reportType: input.reportType,
      periodStart,
      periodEnd,
      compareMode,
      useServiceRole: input.useServiceRole,
    });

    if (!begin.ok) {
      if (begin.reason === "already_running") {
        const active = await findGeneratingRun(logicalReportKey, input.useServiceRole);
        return {
          ok: false,
          code: "already_running",
          message: "Concurrent generation skipped",
          runId: active?.id,
        };
      }
      if (begin.reason === "storage_unavailable") {
        ephemeral = true;
      } else {
        return { ok: false, code: begin.reason, message: begin.message ?? begin.reason };
      }
    }
  } else {
    return { ok: false, code: "invalid_attempt", message: "Unexpected generate attempt resolution" };
  }

  const markFailed = async (msg: string) => {
    if (!ephemeral) {
      await failReportRun({ runId, error: msg, useServiceRole: input.useServiceRole });
    }
  };

  let ctx: BusinessReportRuntimeContext;
  try {
    ctx = await buildBusinessReportContext(input.period, input.reportType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFailed(msg);
    return { ok: false, code: "context_failed", message: msg, runId };
  }

  const aiStarted = Date.now();
  let aiResult = await generateBusinessReportAi(ctx, signal);
  let validation = aiResult.ok ? validateBusinessReportAiOutput(aiResult.data, ctx) : null;

  if (aiResult.ok && validation && !validation.ok && validation.verdict === "needs_retry") {
    aiResult = await generateBusinessReportAi(ctx, signal);
    validation = aiResult.ok ? validateBusinessReportAiOutput(aiResult.data, ctx) : null;
  }

  const llmDurationMs = Date.now() - aiStarted;
  let aiStatus: "completed" | "unavailable" = "unavailable";
  let status: "completed" | "failed" = "failed";
  let aiData = aiResult.ok ? aiResult.data : null;
  let quality = validation?.quality;

  if (aiResult.ok && validation?.ok) {
    aiStatus = "completed";
    status = "completed";
  } else if (PUBLISH_DETERMINISTIC_FALLBACK && (input.allowDeterministicFallback ?? true)) {
    aiStatus = "unavailable";
    status = "completed";
    aiData = null;
    quality = {
      verdict: "publishable",
      dataCompleteness:
        ctx.analytics.metrics.filter((m) => m.trust !== "not_available").length /
        Math.max(1, ctx.analytics.metrics.length),
      metricCoverage: ctx.analytics.metrics.length / 12,
      claimSupport: 1,
      trustCompliance: 1,
      failures: validation && !validation.ok ? [validation.reason] : undefined,
    };
  } else {
    const validationReason =
      validation && !validation.ok ? validation.reason : "validation_failed";
    const msg = aiResult.ok ? validationReason : aiResult.message;
    await markFailed(msg);
    logBusinessReportObservability({
      reportRunId: runId,
      reportType: input.reportType,
      periodStart,
      periodEnd,
      status: "failed",
      aiStatus: "unavailable",
      generationDurationMs: Date.now() - started,
      llmDurationMs,
      failureReason: msg,
      metricCount: ctx.analytics.metrics.length,
      insightCount: ctx.insights.length,
    });
    return { ok: false, code: "generation_failed", message: msg, runId };
  }

  const report = mergeBusinessReport({
    runId,
    logicalReportKey,
    generationVersion,
    ctx,
    ai: aiData,
    aiStatus,
    status,
    error: validation && !validation.ok ? validation.reason : undefined,
  });

  report.quality = quality;

  const parsed = businessReportSchema.safeParse(report);
  if (!parsed.success) {
    await markFailed(parsed.error.message);
    return { ok: false, code: "schema_failed", message: parsed.error.message, runId };
  }

  if (!ephemeral) {
    const persisted = await completeReportRun({
      runId,
      content: report,
      provenance: report.provenance,
      trustSummary: report.trustSummary,
      quality: report.quality ?? {
        verdict: "publishable",
        dataCompleteness: 1,
        metricCoverage: 1,
        claimSupport: 1,
        trustCompliance: 1,
      },
      aiStatus,
      useServiceRole: input.useServiceRole,
    });

    if (!persisted) {
      ephemeral = true;
    }
  }

  logBusinessReportObservability({
    reportRunId: runId,
    reportType: input.reportType,
    periodStart,
    periodEnd,
    status,
    aiStatus,
    generationDurationMs: Date.now() - started,
    llmDurationMs,
    metricCount: ctx.analytics.metrics.length,
    insightCount: ctx.insights.length,
    claimCount: validation?.ok ? validation.quality.claimSupport : 0,
  });

  return { ok: true, report, cached: false, runId, ephemeral: ephemeral || undefined };
}
