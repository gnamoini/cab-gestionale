import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import {
  buildFattureScaduteDigestNotification,
  buildFattureScaduteDigestPayload,
} from "@/lib/fatturazione/fatture-scadute-digest";
import { fanoutEntityNotification } from "@/lib/notifications/dispatch/entity-fanout.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { createNotificationTraceId } from "@/lib/notifications/observability/notification-trace";
import type { InvoiceRow } from "@/src/types/supabase-tables";

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function runFatturazioneOverdueDigestNotify(): Promise<{
  ok: boolean;
  skipped?: string;
  created?: number;
}> {
  const client = createAdminClient();
  const companyId = await resolveSingleCompanyId(client);
  if (!companyId) return { ok: false, skipped: "company_not_found" };

  const { data, error } = await client
    .from("invoices")
    .select("id, status, data_emissione, data_scadenza, totale, residuo, cliente_label, company_id")
    .eq("company_id", companyId)
    .limit(5000);

  if (error) return { ok: false, skipped: error.message };

  const payload = buildFattureScaduteDigestPayload((data ?? []) as unknown as InvoiceRow[]);
  if (!payload) return { ok: true, skipped: "no_overdue_invoices" };

  const legacy = buildFattureScaduteDigestNotification(payload);
  const result = await fanoutEntityNotification(
    {
      notificationEventId: "fatturazione.overdue_digest",
      entityType: "fatturazione",
      entityId: payload.dateYmd,
      companyId,
      legacyNotification: legacy,
      traceId: createNotificationTraceId(),
    },
    client,
  );

  return { ok: true, created: result.created };
}
