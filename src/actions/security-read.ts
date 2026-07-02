"use server";

import { LOG_MODIFICHE_WITH_PROFILE_SELECT, AUTH_LOGS_COLUMNS } from "@/lib/db/table-select-columns";
import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import { writeSecurityAuditLog } from "@/lib/security/security-audit-log";
import type { AuthLogWithProfileRow, LogModificaRow } from "@/src/types/supabase-tables";

export type SecurityUserActivityRow = {
  id: string;
  action: string;
  entita: string;
  when: string;
  actor: string;
  detail: string;
};

export type ListSecurityUserActivityResult =
  | { ok: true; rows: SecurityUserActivityRow[] }
  | { ok: false; message: string };

export type ListRecentSecurityAuditResult =
  | {
      ok: true;
      rows: Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>;
    }
  | { ok: false; message: string };

export type ListAuthLogsAdminResult =
  | { ok: true; rows: AuthLogWithProfileRow[] }
  | { ok: false; message: string };

export type LogSecurityPageAccessResult = { ok: true } | { ok: false; message: string };

function payloadDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const o = payload as Record<string, unknown>;
  if (typeof o.compact === "string") return o.compact;
  if (typeof o.action === "string") return o.action;
  if (typeof o.event === "string") return o.event;
  if ("before" in o || "after" in o) return "Modifica dati";
  if ("snapshot" in o) return "Evento registrato";
  return "Evento registrato";
}

export async function listSecurityUserActivityAction(
  userId: string,
): Promise<ListSecurityUserActivityResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const admin = createServiceAdminClient(caller.url, caller.serviceKey);

  const [audit, auth] = await Promise.all([
    admin
      .from("log_modifiche")
      .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
      .eq("autore_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("auth_logs")
      .select(AUTH_LOGS_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (audit.error) return { ok: false, message: audit.error.message };
  if (auth.error) return { ok: false, message: auth.error.message };

  const auditRows = ((audit.data ?? []) as Array<
    LogModificaRow & { profiles?: { nome?: string | null } | null }
  >).map((r) => ({
    id: `audit-${r.id}`,
    action: r.azione,
    entita: r.entita,
    when: r.created_at,
    actor: r.profiles?.nome?.trim() || "—",
    detail: payloadDetail(r.payload),
  }));

  const authRows = ((auth.data ?? []) as AuthLogWithProfileRow[]).map((r) => ({
    id: `auth-${r.id}`,
    action: r.action.toUpperCase(),
    entita: "auth",
    when: r.created_at,
    actor: r.email,
    detail: r.action === "login" ? "Login" : r.action === "logout" ? "Logout" : "Login fallito",
  }));

  const rows = [...auditRows, ...authRows]
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, 50);

  return { ok: true, rows };
}

export async function listRecentSecurityAuditAction(
  limit = 50,
): Promise<ListRecentSecurityAuditResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const admin = createServiceAdminClient(caller.url, caller.serviceKey);
  const { data, error } = await admin
    .from("log_modifiche")
    .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    rows: (data ?? []) as Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>,
  };
}

export async function listAuthLogsAdminAction(input: {
  limit?: number;
  filterUserId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<ListAuthLogsAdminResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const admin = createServiceAdminClient(caller.url, caller.serviceKey);
  const limit = Math.min(Math.max(input.limit ?? 2500, 1), 5000);

  let q = admin
    .from("auth_logs")
    .select(`${AUTH_LOGS_COLUMNS}, profiles(id, nome)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.filterUserId) {
    q = q.eq("user_id", input.filterUserId);
  }
  if (input.dateFrom) {
    q = q.gte("created_at", input.dateFrom);
  }
  if (input.dateTo) {
    q = q.lte("created_at", input.dateTo);
  }

  const { data, error } = await q;
  if (error) return { ok: false, message: error.message };
  return { ok: true, rows: (data ?? []) as unknown as AuthLogWithProfileRow[] };
}

export async function logSecurityPageAccessAction(): Promise<LogSecurityPageAccessResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const admin = createServiceAdminClient(caller.url, caller.serviceKey);
  await writeSecurityAuditLog(admin, {
    actorUserId: caller.callerId,
    targetUserId: caller.callerId,
    action: "ACCESS_SECURITY",
    result: "success",
    entitaAzione: "ACCESS_SECURITY",
  });
  return { ok: true };
}
