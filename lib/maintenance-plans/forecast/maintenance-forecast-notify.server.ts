import { buildMezziTagliandiHubHref } from "@/lib/navigation/mezzi-tagliandi-links";

import { createClient } from "@supabase/supabase-js";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { readSupabasePublicEnv } from "@/lib/env/supabase-public";
import { formatDueReason } from "@/lib/maintenance-plans/maintenance-due-engine";
import type { ForecastExplainability } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import { entityDispatchIdempotencyKey } from "@/lib/notifications/dispatch/entity-idempotency";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch/notification-dispatch-service.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { createNotificationTraceId } from "@/lib/notifications/observability/notification-trace";

export function addDaysIso(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runMaintenanceForecastNotify(): Promise<{
  scanned: number;
  notified: number;
}> {
  const env = readSupabasePublicEnv();
  const url = env?.url;
  const key = readSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error("[maintenance-forecast] missing Supabase env");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const companyId = await resolveSingleCompanyId(supabase);
  if (!companyId) return { scanned: 0, notified: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDaysIso(today, 7);
  const dateBucket = today;

  const { data: forecasts, error } = await supabase
    .from("vehicle_maintenance_forecasts")
    .select(
      "config_id, next_date_estimated, confidence_level, confidence_pct, remaining_value, trigger_reason, explainability_json",
    )
    .not("next_date_estimated", "is", null)
    .lte("next_date_estimated", in7)
    .gte("next_date_estimated", today);
  if (error) throw new Error(error.message);
  if (!forecasts?.length) return { scanned: 0, notified: 0 };

  let notified = 0;
  for (const f of forecasts) {
    if (f.confidence_level === "bassa" && (f.confidence_pct ?? 0) < 40) continue;

    const { data: config } = await supabase
      .from("vehicle_maintenance_configs")
      .select("mezzo_id, label, preset_id, interval_type")
      .eq("id", f.config_id)
      .maybeSingle();
    if (!config) continue;

    let presetNome = (config.label as string | null)?.trim() || "mezzo";
    if (config.preset_id) {
      const { data: preset } = await supabase
        .from("maintenance_plans")
        .select("nome")
        .eq("id", config.preset_id)
        .maybeSingle();
      if (preset?.nome) presetNome = preset.nome as string;
    }

    const explainability = (f.explainability_json ?? null) as ForecastExplainability | null;
    const remainingValue = f.remaining_value != null ? Number(f.remaining_value) : null;
    const dueBody = formatDueReason({
      presetNome,
      explainability,
      remainingValue,
      isOverdue: remainingValue != null && remainingValue <= 0,
    });
    const body = dueBody || `Scadenza stimata ${f.next_date_estimated}`;

    const configId = String(f.config_id);
    const dedupKey = `tagliando-forecast:${configId}:${dateBucket}`;
    const title = `Tagliando previsto: ${presetNome}`;
    const href = buildMezziTagliandiHubHref({
      mezzoId: config.mezzo_id as string,
      hubTab: "tagliandi",
      highlight: configId,
    });

    const traceId = createNotificationTraceId();
    const result = await dispatchNotificationEvent(
      {
        notificationEventId: "mezzi.tagliando_forecast_7g",
        companyId,
        dispatchIdempotencyKey: entityDispatchIdempotencyKey(
          "mezzi.tagliando_forecast_7g",
          "vehicle_maintenance_config",
          configId,
          dateBucket,
        ),
        traceId,
        entityId: configId,
        buildCommand: (recipientId) => ({
          notificationType: "tagliando_previsto_7g",
          title,
          body,
          deepLink: href,
          entityType: "vehicle_maintenance_config",
          entityId: configId,
          dedupKey: `${dedupKey}:u:${recipientId}`,
          idempotencyKey: `${dedupKey}:recipient:${recipientId}`,
          translationKey: "notification.tagliando_previsto_7g",
          translationParams: { presetNome, nextDate: f.next_date_estimated },
          actorId: "server",
        }),
      },
      supabase,
    );

    if (result.created > 0) notified += result.created;
  }

  return { scanned: forecasts.length, notified };
}
