import {
  DEFAULT_AUDIT_RETENTION_CONFIG,
  type AuditRetentionConfig,
} from "@/lib/audit/types";

function readHistoryDefault(o: Record<string, unknown>): number | undefined {
  const history = o.audit_history_retention;
  if (history && typeof history === "object" && !Array.isArray(history)) {
    const d = (history as Record<string, unknown>).default;
    if (typeof d === "number" && d > 0) return d;
  }
  if (typeof o.entity_retention_default === "number" && o.entity_retention_default > 0) {
    return o.entity_retention_default;
  }
  return undefined;
}

function readHistoryOverrides(o: Record<string, unknown>): Record<string, number> {
  const history = o.audit_history_retention;
  if (history && typeof history === "object" && !Array.isArray(history)) {
    const overrides = (history as Record<string, unknown>).overrides;
    if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
      return overrides as Record<string, number>;
    }
  }
  if (o.entity_retention_overrides && typeof o.entity_retention_overrides === "object") {
    return o.entity_retention_overrides as Record<string, number>;
  }
  return {};
}

export function parseAuditRetentionConfig(raw: unknown): AuditRetentionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_AUDIT_RETENTION_CONFIG };
  }
  const o = raw as Record<string, unknown>;
  const entityDefault = readHistoryDefault(o) ?? DEFAULT_AUDIT_RETENTION_CONFIG.entity_retention_default;
  const overrides = readHistoryOverrides(o);

  const historyRaw = o.audit_history_retention;
  const audit_history_retention =
    historyRaw && typeof historyRaw === "object" && !Array.isArray(historyRaw)
      ? {
          default: entityDefault,
          scope: "ENTITY_HISTORY" as const,
          overrides: Object.keys(overrides).length ? overrides : undefined,
        }
      : DEFAULT_AUDIT_RETENTION_CONFIG.audit_history_retention;

  return {
    entity_retention_default: entityDefault,
    entity_retention_overrides: overrides,
    audit_history_retention,
    dashboard_days:
      typeof o.dashboard_days === "number"
        ? o.dashboard_days
        : DEFAULT_AUDIT_RETENTION_CONFIG.dashboard_days,
    dashboard_max_rows:
      typeof o.dashboard_max_rows === "number"
        ? o.dashboard_max_rows
        : DEFAULT_AUDIT_RETENTION_CONFIG.dashboard_max_rows,
  };
}

export function entityRetentionLimit(
  config: AuditRetentionConfig,
  entita: string,
): number {
  const override =
    config.audit_history_retention?.overrides?.[entita] ??
    config.entity_retention_overrides[entita];
  if (typeof override === "number" && override > 0) return override;
  return config.audit_history_retention?.default ?? config.entity_retention_default;
}

/** ENTITY_HISTORY — max voci per (entita, entita_id); allineato a app_settings audit.retention. */
export const LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT =
  DEFAULT_AUDIT_RETENTION_CONFIG.entity_retention_default;
