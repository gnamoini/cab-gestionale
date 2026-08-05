import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { fanoutEntityNotification } from "@/lib/notifications/dispatch/entity-fanout.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { createNotificationTraceId } from "@/lib/notifications/observability/notification-trace";

const OVERDUE_DAYS = 14;

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function romeDateYmd(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function runLavorazioniOverdueDigestNotify(): Promise<{
  ok: boolean;
  skipped?: string;
  created?: number;
  count?: number;
}> {
  const client = createAdminClient();
  const companyId = await resolveSingleCompanyId(client);
  if (!companyId) return { ok: false, skipped: "company_not_found" };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await client
    .from("lavorazioni")
    .select("id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .neq("stato", "completata")
    .neq("stato", "archiviata")
    .lt("created_at", cutoffIso)
    .limit(500);

  if (error) return { ok: false, skipped: error.message };

  const count = data?.length ?? 0;
  if (count <= 0) return { ok: true, skipped: "no_overdue", count: 0 };

  const dateYmd = romeDateYmd();
  const result = await fanoutEntityNotification(
    {
      notificationEventId: "lavorazioni.overdue_digest",
      entityType: "lavorazioni",
      entityId: dateYmd,
      companyId,
      legacyNotification: {
        kind: "lavorazioni_ritardo_digest",
        id: `lav-ritardo:${dateYmd}`,
        dateYmd,
        count,
        createdAt: new Date().toISOString(),
      },
      traceId: createNotificationTraceId(),
    },
    client,
  );

  return { ok: true, created: result.created, count };
}
