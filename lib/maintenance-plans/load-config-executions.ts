import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { ExecutionPoint } from "@/lib/maintenance-plans/forecast/ema-forecast";

export type ServiceExecutionLite = {
  config_id: string | null;
  mezzo_id?: string | null;
  plan_id: string | null;
  performed_at: string;
  ore_at_service: number;
  km_at_service: number | null;
  lavorazione_id?: string | null;
};

export type ConfigExecutionMatchKey = {
  configId: string;
  mezzoId: string;
  presetId: string | null;
  intervalType: MaintenanceIntervalType;
};

/** Valore contatore usato dal forecast (km → km_at_service con fallback ore). */
export function valueAtServiceForInterval(
  intervalType: MaintenanceIntervalType,
  row: { ore_at_service: number; km_at_service: number | null },
): number {
  if (intervalType === "km") {
    const km = row.km_at_service != null ? Number(row.km_at_service) : null;
    if (km != null && km > 0) return km;
    return Number(row.ore_at_service);
  }
  return Number(row.ore_at_service);
}

/** Servizio collegato alla config per config_id oppure mezzo+preset (legacy senza config_id). */
export function serviceMatchesConfig(
  service: Pick<ServiceExecutionLite, "config_id" | "mezzo_id" | "plan_id">,
  config: ConfigExecutionMatchKey,
): boolean {
  if (service.config_id && service.config_id === config.configId) return true;
  if (!config.presetId) return false;
  if (service.plan_id !== config.presetId) return false;
  if (service.mezzo_id && service.mezzo_id !== config.mezzoId) return false;
  // config_id null o diverso ma stesso mezzo+preset: usa come esecuzione del piano
  return service.config_id == null || service.config_id === config.configId;
}

export function toExecutionPoint(
  intervalType: MaintenanceIntervalType,
  row: { performed_at: string; ore_at_service: number; km_at_service: number | null },
): ExecutionPoint {
  return {
    performedAt: row.performed_at,
    valueAtService: valueAtServiceForInterval(intervalType, row),
  };
}

export function pickLatestMatchingService(
  services: readonly ServiceExecutionLite[],
  config: ConfigExecutionMatchKey,
): ServiceExecutionLite | null {
  let best: ServiceExecutionLite | null = null;
  for (const s of services) {
    if (!serviceMatchesConfig(s, config)) continue;
    if (!best) {
      best = s;
      continue;
    }
    const dateCmp = s.performed_at.localeCompare(best.performed_at);
    if (dateCmp > 0) {
      best = s;
      continue;
    }
    if (dateCmp === 0) {
      const sVal = valueAtServiceForInterval(config.intervalType, s);
      const bVal = valueAtServiceForInterval(config.intervalType, best);
      if (sVal > bVal) best = s;
    }
  }
  return best;
}

export function mergeExecutionPoints(
  points: readonly ExecutionPoint[],
  extra?: ExecutionPoint | null,
): ExecutionPoint[] {
  const out = [...points];
  if (extra) out.push(extra);
  out.sort((a, b) => {
    const d = a.performedAt.localeCompare(b.performedAt);
    if (d !== 0) return d;
    return a.valueAtService - b.valueAtService;
  });
  return out;
}

/** Dedup by performedAt+value (synthetic vs registered). Prefer higher value same day. */
export function dedupeExecutionPoints(points: readonly ExecutionPoint[]): ExecutionPoint[] {
  const byKey = new Map<string, ExecutionPoint>();
  for (const p of points) {
    const key = `${p.performedAt}:${Math.round(p.valueAtService)}`;
    const prev = byKey.get(key);
    if (!prev || p.valueAtService > prev.valueAtService) byKey.set(key, p);
  }
  return [...byKey.values()].sort((a, b) => {
    const d = a.performedAt.localeCompare(b.performedAt);
    if (d !== 0) return d;
    return a.valueAtService - b.valueAtService;
  });
}
