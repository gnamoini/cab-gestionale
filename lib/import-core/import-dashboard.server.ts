import "server-only";

import { formatImportCorrelationDisplay } from "@/lib/import-core/correlation-id";
import { importErrorUserMessage } from "@/lib/import-core/import-error-catalog";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type ImportDashboardStats = {
  active: number;
  failed24h: number;
  needsReview: number;
  p95DurationMs: number | null;
  errorRate24h: number;
  aiTokens24h: number;
  recent: Array<{
    id: string;
    feature: string;
    status: string;
    errorCode: string | null;
    errorMessage: string | null;
    correlationDisplay: string;
    createdAt: string;
  }>;
};

export async function loadImportDashboardStats(): Promise<ImportDashboardStats> {
  const sb = await createSupabaseServerUserClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await sb
    .from("import_executions")
    .select("id, feature, status, error_code, correlation_id, duration_ms, tokens_input, tokens_output, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = rows ?? [];
  const recent24h = list.filter((r) => String(r.created_at) >= since);
  const failed24h = recent24h.filter((r) => r.status === "failed").length;
  const durations = recent24h
    .map((r) => (r.duration_ms != null ? Number(r.duration_ms) : null))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const p95DurationMs =
    durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]! : null;

  return {
    active: list.filter((r) => ["queued", "processing", "ai_processing", "committing"].includes(String(r.status))).length,
    failed24h,
    needsReview: list.filter((r) => r.status === "needs_review").length,
    p95DurationMs,
    errorRate24h: recent24h.length ? failed24h / recent24h.length : 0,
    aiTokens24h: recent24h.reduce(
      (sum, r) => sum + Number(r.tokens_input ?? 0) + Number(r.tokens_output ?? 0),
      0,
    ),
    recent: list.slice(0, 20).map((r) => ({
      id: String(r.id),
      feature: String(r.feature),
      status: String(r.status),
      errorCode: r.error_code ? String(r.error_code) : null,
      correlationDisplay: formatImportCorrelationDisplay(String(r.correlation_id)),
      createdAt: String(r.created_at),
      errorMessage: r.error_code ? importErrorUserMessage(String(r.error_code)) : null,
    })),
  };
}
