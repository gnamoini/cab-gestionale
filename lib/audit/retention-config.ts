import {
  DEFAULT_AUDIT_RETENTION_CONFIG,
  type AuditRetentionConfig,
} from "@/lib/audit/types";

export function parseAuditRetentionConfig(raw: unknown): AuditRetentionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_AUDIT_RETENTION_CONFIG };
  }
  const o = raw as Record<string, unknown>;
  const overrides =
    o.entity_retention_overrides && typeof o.entity_retention_overrides === "object"
      ? (o.entity_retention_overrides as Record<string, number>)
      : DEFAULT_AUDIT_RETENTION_CONFIG.entity_retention_overrides;

  return {
    entity_retention_default:
      typeof o.entity_retention_default === "number"
        ? o.entity_retention_default
        : DEFAULT_AUDIT_RETENTION_CONFIG.entity_retention_default,
    entity_retention_overrides: overrides,
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
  const override = config.entity_retention_overrides[entita];
  if (typeof override === "number" && override > 0) return override;
  return config.entity_retention_default;
}

/** Client-side constant aligned with DB default (pre-fetch). */
export const LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT =
  DEFAULT_AUDIT_RETENTION_CONFIG.entity_retention_default;
