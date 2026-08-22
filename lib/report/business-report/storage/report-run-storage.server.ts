import "server-only";

import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type {
  BusinessReport,
  BusinessReportProvenance,
  BusinessReportQuality,
  BusinessReportRunRow,
  BusinessReportType,
} from "@/lib/report/business-report/types";
import type { ReportAnalyticsTrustSummary } from "@/lib/report/analytics-engine/types";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import {
  BUSINESS_REPORT_ENGINE_VERSION,
  BUSINESS_REPORT_PROMPT_VERSION,
  BUSINESS_REPORT_SCHEMA_VERSION,
} from "@/lib/report/business-report/versions";
import { isReportRunsSchemaError } from "@/lib/report/business-report/storage/report-runs-schema-error";

export type BeginRunInput = {
  runId: string;
  logicalReportKey: string;
  generationVersion: number;
  idempotencyKey: string;
  reportType: BusinessReportType;
  periodStart: string;
  periodEnd: string;
  compareMode: ReportCompareMode;
  useServiceRole?: boolean;
};

export type BeginRunResult =
  | { ok: true; row: BusinessReportRunRow }
  | {
      ok: false;
      reason: "already_running" | "already_completed" | "db_error" | "storage_unavailable";
      message?: string;
    };

function mapRow(row: Record<string, unknown>): BusinessReportRunRow {
  return row as unknown as BusinessReportRunRow;
}

async function client(useServiceRole?: boolean) {
  return useServiceRole ? createSupabaseServerServiceClient() : createSupabaseServerUserClient();
}

export async function findLatestCompletedRun(
  logicalReportKey: string,
  useServiceRole?: boolean,
): Promise<BusinessReportRunRow | null> {
  try {
    const sb = await client(useServiceRole);
    const { data, error } = await sb
      .from("report_runs")
      .select("*")
      .eq("logical_report_key", logicalReportKey)
      .eq("status", "completed")
      .order("generation_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function findGeneratingRun(
  logicalReportKey: string,
  useServiceRole?: boolean,
): Promise<BusinessReportRunRow | null> {
  try {
    const sb = await client(useServiceRole);
    const { data } = await sb
      .from("report_runs")
      .select("*")
      .eq("logical_report_key", logicalReportKey)
      .eq("status", "generating")
      .limit(1)
      .maybeSingle();
    return data ? mapRow(data) : null;
  } catch {
    return null;
  }
}

export async function findLatestRunForLogicalKey(
  logicalReportKey: string,
  useServiceRole?: boolean,
): Promise<BusinessReportRunRow | null> {
  try {
    const sb = await client(useServiceRole);
    const { data } = await sb
      .from("report_runs")
      .select("*")
      .eq("logical_report_key", logicalReportKey)
      .order("generation_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? mapRow(data) : null;
  } catch {
    return null;
  }
}

export async function getMaxGenerationVersion(
  logicalReportKey: string,
  useServiceRole?: boolean,
): Promise<number> {
  try {
    const sb = await client(useServiceRole);
    const { data } = await sb
      .from("report_runs")
      .select("generation_version")
      .eq("logical_report_key", logicalReportKey)
      .order("generation_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return typeof data?.generation_version === "number" ? data.generation_version : 0;
  } catch {
    return 0;
  }
}

/** Atomic begin — DB partial unique index is SSOT for single-flight. */
export async function beginReportRun(input: BeginRunInput): Promise<BeginRunResult> {
  try {
    const sb = await client(input.useServiceRole);

    const { data, error } = await sb
      .from("report_runs")
      .insert({
        id: input.runId,
        logical_report_key: input.logicalReportKey,
        generation_version: input.generationVersion,
        idempotency_key: input.idempotencyKey,
        report_type: input.reportType,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        compare_mode: input.compareMode,
        status: "generating",
        engine_version: BUSINESS_REPORT_ENGINE_VERSION,
        prompt_version: BUSINESS_REPORT_PROMPT_VERSION,
        report_schema_version: BUSINESS_REPORT_SCHEMA_VERSION,
        ai_status: "unavailable",
        generated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, reason: "already_running", message: error.message };
      }
      if (isReportRunsSchemaError(error.message)) {
        return { ok: false, reason: "storage_unavailable", message: error.message };
      }
      return { ok: false, reason: "db_error", message: error.message };
    }

    return { ok: true, row: mapRow(data) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isReportRunsSchemaError(message)) {
      return { ok: false, reason: "storage_unavailable", message };
    }
    return { ok: false, reason: "db_error", message };
  }
}

/** Technical retry — same generation_version, failed or stale-generating row. */
export async function reactivateReportRun(input: {
  runId: string;
  useServiceRole?: boolean;
}): Promise<boolean> {
  try {
    const sb = await client(input.useServiceRole);
    const { error } = await sb
      .from("report_runs")
      .update({
        status: "generating",
        error: null,
        completed_at: null,
        generated_at: new Date().toISOString(),
      })
      .eq("id", input.runId)
      .in("status", ["failed", "generating"]);
    return !error;
  } catch {
    return false;
  }
}

export async function completeReportRun(input: {
  runId: string;
  content: BusinessReport;
  provenance: BusinessReportProvenance;
  trustSummary: ReportAnalyticsTrustSummary;
  quality: BusinessReportQuality;
  aiStatus: BusinessReport["aiStatus"];
  useServiceRole?: boolean;
}): Promise<boolean> {
  try {
    const sb = await client(input.useServiceRole);
    const { error } = await sb
      .from("report_runs")
      .update({
        status: "completed",
        content: input.content,
        provenance: input.provenance,
        trust_summary: input.trustSummary,
        quality: input.quality,
        ai_status: input.aiStatus,
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", input.runId)
      .eq("status", "generating");
    return !error;
  } catch {
    return false;
  }
}

export async function failReportRun(input: {
  runId: string;
  error: string;
  useServiceRole?: boolean;
}): Promise<boolean> {
  try {
    const sb = await client(input.useServiceRole);
    const { error } = await sb
      .from("report_runs")
      .update({
        status: "failed",
        error: input.error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.runId);
    return !error;
  } catch {
    return false;
  }
}

export async function getReportRunById(id: string): Promise<BusinessReportRunRow | null> {
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb.from("report_runs").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function listReportRunHistory(limit = 30): Promise<BusinessReportRunRow[]> {
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb
      .from("report_runs")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export async function listGenerationsForLogicalReport(
  logicalReportKey: string,
): Promise<BusinessReportRunRow[]> {
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb
      .from("report_runs")
      .select("*")
      .eq("logical_report_key", logicalReportKey)
      .order("generation_version", { ascending: false });
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}
