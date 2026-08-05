/** Audit / Event Subsystem — tipi SSOT. */

export const AUDIT_EVENT_TYPES = [
  "DATA_CHANGE",
  "WORKFLOW_ACTION",
  "SECURITY_ACTION",
  "SYSTEM_EVENT",
  "IMPORT_EVENT",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const AUDIT_ACTOR_TYPES = [
  "USER",
  "SYSTEM",
  "AI",
  "API",
  "IMPORT",
  "SCHEDULER",
] as const;

export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "RESTORE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditEventInput = {
  entityType: string;
  entityId: string;
  action: AuditAction | string;
  eventType?: AuditEventType;
  actorType?: AuditActorType;
  autoreId?: string | null;
  companyId?: string | null;
  module?: string | null;
  title?: string | null;
  description?: string | null;
  severity?: AuditSeverity;
  category?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  payload?: unknown;
  before?: unknown;
  after?: unknown;
  context?: { oggetto?: string; entityLabel?: string };
  snapshot?: Record<string, unknown>;
};

export type AuditHistoryRetentionConfig = {
  default: number;
  scope: "ENTITY_HISTORY";
  overrides?: Record<string, number>;
};

export type AuditRetentionConfig = {
  /** ENTITY_HISTORY — max eventi per (entita, entita_id). */
  entity_retention_default: number;
  entity_retention_overrides: Record<string, number>;
  audit_history_retention?: AuditHistoryRetentionConfig;
  dashboard_days: number;
  dashboard_max_rows: number;
};

export const DEFAULT_AUDIT_RETENTION_CONFIG: AuditRetentionConfig = {
  entity_retention_default: 100,
  entity_retention_overrides: {},
  audit_history_retention: { default: 100, scope: "ENTITY_HISTORY" },
  dashboard_days: 90,
  dashboard_max_rows: 10000,
};
