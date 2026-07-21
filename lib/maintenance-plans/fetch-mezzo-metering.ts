import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ASSET_LIFECYCLE_V1_KEY,
  ASSET_LIFECYCLE_V1_MODULE,
  isAssetLifecycleSubFlagActive,
  readAssetLifecycleV1FromRows,
  resolveAssetLifecycleV1Flags,
} from "@/lib/officina/asset-lifecycle-v1-flag";
import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import {
  resolveMezzoMeteringHybrid,
  type MezzoMetering,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";

/** SSOT metering — usare ovunque (forecast, overview, registrazione). */
export async function resolveCurrentMezzoMetering(
  client: SupabaseClient,
  mezzoId: string,
): Promise<MezzoMetering> {
  const [mezzoRes, mileageRes, lifecycleRes] = await Promise.all([
    client.from("mezzi").select("meta, km").eq("id", mezzoId).maybeSingle(),
    client
      .from("asset_mileage_readings")
      .select("km")
      .eq("mezzo_id", mezzoId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("app_settings")
      .select("module, key, value")
      .eq("module", ASSET_LIFECYCLE_V1_MODULE)
      .eq("key", ASSET_LIFECYCLE_V1_KEY)
      .maybeSingle(),
  ]);

  const meta = parseMezzoMeta(mezzoRes.data?.meta);
  const lifecycleFlags = resolveAssetLifecycleV1Flags(
    readAssetLifecycleV1FromRows(lifecycleRes.data ? [lifecycleRes.data] : []),
  );
  const latestAssetKm =
    mileageRes.data?.km != null && Number.isFinite(Number(mileageRes.data.km))
      ? Number(mileageRes.data.km)
      : null;
  const assetLifecycleActive =
    isAssetLifecycleSubFlagActive(lifecycleFlags, "mileage_history") && latestAssetKm != null;

  return resolveMezzoMeteringHybrid({
    oreKm: meta.oreLavoro ?? 0,
    kmFromMeta: mezzoRes.data?.km != null ? Number(mezzoRes.data.km) : meta.km ?? null,
    latestAssetKm,
    assetLifecycleActive,
  });
}

export async function resolveCurrentMezzoMeteringBatch(
  client: SupabaseClient,
  mezzoIds: string[],
): Promise<Map<string, MezzoMetering>> {
  const unique = [...new Set(mezzoIds.filter(Boolean))];
  const out = new Map<string, MezzoMetering>();
  if (unique.length === 0) return out;

  const [mezziRes, lifecycleRes] = await Promise.all([
    client.from("mezzi").select("id, meta, km").in("id", unique),
    client
      .from("app_settings")
      .select("module, key, value")
      .eq("module", ASSET_LIFECYCLE_V1_MODULE)
      .eq("key", ASSET_LIFECYCLE_V1_KEY)
      .maybeSingle(),
  ]);

  const lifecycleFlags = resolveAssetLifecycleV1Flags(
    readAssetLifecycleV1FromRows(lifecycleRes.data ? [lifecycleRes.data] : []),
  );
  const mileageActive = isAssetLifecycleSubFlagActive(lifecycleFlags, "mileage_history");

  let latestKmByMezzo = new Map<string, number>();
  if (mileageActive) {
    const { data: readings } = await client
      .from("asset_mileage_readings")
      .select("mezzo_id, km, recorded_at")
      .in("mezzo_id", unique)
      .order("recorded_at", { ascending: false });
    for (const r of readings ?? []) {
      const mid = r.mezzo_id as string;
      if (!latestKmByMezzo.has(mid) && r.km != null) {
        latestKmByMezzo.set(mid, Number(r.km));
      }
    }
  }

  for (const m of mezziRes.data ?? []) {
    const id = m.id as string;
    const meta = parseMezzoMeta(m.meta);
    const latestAssetKm = latestKmByMezzo.get(id) ?? null;
    out.set(
      id,
      resolveMezzoMeteringHybrid({
        oreKm: meta.oreLavoro ?? 0,
        kmFromMeta: m.km != null ? Number(m.km) : meta.km ?? null,
        latestAssetKm,
        assetLifecycleActive: mileageActive && latestAssetKm != null,
      }),
    );
  }

  for (const id of unique) {
    if (!out.has(id)) {
      out.set(
        id,
        resolveMezzoMeteringHybrid({
          oreKm: 0,
          kmFromMeta: null,
          latestAssetKm: null,
          assetLifecycleActive: false,
        }),
      );
    }
  }

  return out;
}
