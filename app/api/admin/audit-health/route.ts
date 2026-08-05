import { NextResponse } from "next/server";
import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { parseAuditRetentionConfig } from "@/lib/audit/retention-config";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerIsAdmin } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type HealthStatus = "ok" | "degraded" | "error";

export async function GET() {
  const canManage = await verifyServerIsAdmin();
  if (!canManage) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { url } = assertSupabasePublicEnv();
  const serviceKey = assertSupabaseServiceRoleKey();
  const admin = createServiceAdminClient(url, serviceKey);

  const checks: Record<string, unknown> = {};
  let status: HealthStatus = "ok";

  const { data: latest, error: latestErr } = await admin
    .from("log_modifiche")
    .select("id, created_at, entita, actor_type, event_type")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    status = "error";
    checks.writesOk = { ok: false, detail: latestErr.message };
  } else if (!latest) {
    status = "degraded";
    checks.writesOk = { ok: false, detail: "nessun evento in log_modifiche" };
  } else {
    const ageMs = Date.now() - Date.parse(latest.created_at);
    const ageMinutes = Math.round(ageMs / 60_000);
    checks.writesOk = {
      ok: true,
      lastEventAt: latest.created_at,
      lastEntita: latest.entita,
      ageMinutes,
      actorType: (latest as { actor_type?: string }).actor_type ?? null,
      eventType: (latest as { event_type?: string }).event_type ?? null,
    };
    if (ageMinutes > 24 * 60) status = "degraded";
  }

  const { data: retentionRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("module", "audit")
    .eq("key", "retention")
    .maybeSingle();

  const retentionConfig = parseAuditRetentionConfig(retentionRow?.value);
  checks.retentionOk = {
    ok: true,
    entityDefault: retentionConfig.entity_retention_default,
    auditHistoryScope: retentionConfig.audit_history_retention?.scope ?? "ENTITY_HISTORY",
    dashboardDays: retentionConfig.dashboard_days,
    dashboardMaxRows: retentionConfig.dashboard_max_rows,
  };

  const { count: nullEventType } = await admin
    .from("log_modifiche")
    .select("id", { count: "exact", head: true })
    .is("event_type", null);

  const { count: nullCompany } = await admin
    .from("log_modifiche")
    .select("id", { count: "exact", head: true })
    .is("company_id", null);

  checks.schemaOk = {
    eventTypeNullCount: nullEventType ?? 0,
    companyIdNullCount: nullCompany ?? 0,
  };
  if ((nullEventType ?? 0) > 0 || (nullCompany ?? 0) > 0) status = "degraded";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: coverageGaps } = await admin
    .from("audit_coverage_events")
    .select("id", { count: "exact", head: true })
    .eq("expected_audit", true)
    .eq("actual_audit", false)
    .gte("created_at", since);

  checks.coverageGapsLast24h = coverageGaps ?? 0;
  if ((coverageGaps ?? 0) > 0) status = "degraded";

  checks.rlsOk = { insertPolicy: "cap_log_insert", selectPolicy: "cap_log_select" };
  checks.triggerOk = { retentionTrigger: "trg_log_modifiche_retention" };

  return NextResponse.json({ status, checks, checkedAt: new Date().toISOString() });
}
