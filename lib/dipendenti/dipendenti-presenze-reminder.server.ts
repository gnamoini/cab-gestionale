import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import {
  buildDipendentiPresenzeReminderNotification,
  buildDipendentiPresenzeReminderPayload,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { fanoutEntityNotification } from "@/lib/notifications/dispatch/entity-fanout.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { createNotificationTraceId } from "@/lib/notifications/observability/notification-trace";

function romeNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
}

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type DipendentiPresenzeReminderResult = {
  ok: boolean;
  skipped?: string;
  created?: number;
  dateYmd?: string;
};

function romeDateYmd(now = romeNow()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function runDipendentiPresenzeReminderNotify(): Promise<DipendentiPresenzeReminderResult> {
  const now = romeNow();
  if (!shouldRunDipendentiPresenzeReminderCheck(now)) {
    return { ok: true, skipped: "outside_reminder_window" };
  }

  const client = createAdminClient();
  const companyId = await resolveSingleCompanyId(client);
  if (!companyId) {
    return { ok: false, skipped: "company_not_found" };
  }

  const today = romeDateYmd(now);

  const [employeesRes, entriesRes] = await Promise.all([
    client.from("dipendenti_timesheet_employees").select("id, display_name, in_settings"),
    client
      .from("dipendenti_timesheet_entries")
      .select("dipendente_id, work_date, ore_ordinarie, ore_straordinarie, ore_assenza, assenza")
      .eq("work_date", today),
  ]);

  if (employeesRes.error || entriesRes.error) {
    return { ok: false, skipped: employeesRes.error?.message ?? entriesRes.error?.message };
  }

  const employees = (employeesRes.data ?? []).map((e) => ({
    id: e.id,
    display_name: e.display_name ?? "",
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: e.in_settings ?? false,
    created_at: "",
    updated_at: "",
  }));

  const entries = (entriesRes.data ?? []).map((e) => ({
    id: "",
    dipendente_id: e.dipendente_id,
    work_date: e.work_date,
    ore_ordinarie: Number(e.ore_ordinarie ?? 0),
    ore_straordinarie: Number(e.ore_straordinarie ?? 0),
    assenza: Boolean(e.assenza),
    motivo_assenza: null,
    ore_assenza: Number(e.ore_assenza ?? 0),
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  }));

  const payload = buildDipendentiPresenzeReminderPayload(employees, entries, today, now);

  if (!payload) {
    return { ok: true, skipped: "no_missing_presenze", dateYmd: today };
  }

  const legacy = buildDipendentiPresenzeReminderNotification(payload);
  const traceId = createNotificationTraceId();
  const result = await fanoutEntityNotification(
    {
      notificationEventId: "dipendenti.presence_reminder",
      entityType: "dipendenti_presenze",
      entityId: today,
      companyId,
      legacyNotification: legacy,
      traceId,
    },
    client,
  );

  return { ok: true, created: result.created, dateYmd: today };
}
