import { buildMezziTagliandiHubHref } from "@/lib/navigation/mezzi-tagliandi-links";

import { createClient } from "@supabase/supabase-js";
import { createNotificationRpc } from "@/lib/notifications/create-notification-rpc";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { readSupabasePublicEnv } from "@/lib/env/supabase-public";

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
  if (!url || !key) return { scanned: 0, notified: 0 };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDaysIso(today, 7);
  const dateBucket = today;

  const { data: forecasts, error } = await supabase
    .from("vehicle_maintenance_forecasts")
    .select("config_id, next_date_estimated, confidence_level, confidence_pct")
    .not("next_date_estimated", "is", null)
    .lte("next_date_estimated", in7)
    .gte("next_date_estimated", today);
  if (error || !forecasts?.length) return { scanned: forecasts?.length ?? 0, notified: 0 };

  let notified = 0;
  for (const f of forecasts) {
    if (f.confidence_level === "bassa" && (f.confidence_pct ?? 0) < 40) continue;

    const { data: config } = await supabase
      .from("vehicle_maintenance_configs")
      .select("mezzo_id, label")
      .eq("id", f.config_id)
      .maybeSingle();
    if (!config) continue;

    const dedupKey = `tagliando-forecast:${f.config_id}:${dateBucket}`;
    const title = `Tagliando previsto: ${config.label ?? "mezzo"}`;
    const body = `Scadenza stimata ${f.next_date_estimated}`;

    const result = await createNotificationRpc(supabase, {
      type: "tagliando_previsto_7g",
      title,
      body,
      href: buildMezziTagliandiHubHref({ mezzoId: config.mezzo_id as string, hubTab: "tagliandi", highlight: f.config_id }),
      entity_type: "vehicle_maintenance_config",
      entity_id: f.config_id,
      dedup_key: dedupKey,
    });
    if (result.inserted) notified++;
  }

  return { scanned: forecasts.length, notified };
}
