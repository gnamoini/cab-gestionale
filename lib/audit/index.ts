export { AuditLogWriteError } from "@/lib/audit/errors";
export type {
  AuditAction,
  AuditActorType,
  AuditEventInput,
  AuditEventType,
  AuditRetentionConfig,
  AuditSeverity,
} from "@/lib/audit/types";
export { AUDIT_EVENT_TYPES, AUDIT_ACTOR_TYPES, DEFAULT_AUDIT_RETENTION_CONFIG } from "@/lib/audit/types";
export { recordAuditEvent, auditContext } from "@/lib/audit/record";
export { auditDiff, auditSnapshot } from "@/lib/audit/build-diff";
export type { AuditLogContext } from "@/lib/audit/record";
export { recordDataChange } from "@/lib/audit/record-data-change";
export { recordWorkflowAction } from "@/lib/audit/record-workflow-action";
export { recordImportEvent } from "@/lib/audit/record-import-event";
export { resolveAuditActor, resolveWriteActorIdFromClient } from "@/lib/audit/resolve-actor";
export { rbacLogEntitaModule } from "@/lib/audit/resolve-module";
export {
  resolveRequestId,
  generateRequestId,
  setRequestIdForContext,
} from "@/lib/audit/resolve-request-context";
export {
  parseAuditRetentionConfig,
  entityRetentionLimit,
  LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT,
} from "@/lib/audit/retention-config";
export { scoreActivity, baseActivityScore, freshnessFactor } from "@/lib/audit/score-activity";
export { getRecentActivities, LOG_AGGREGATION_WINDOW_MS } from "@/lib/audit/get-recent-activities";
export type { RecentActivityItem, GetRecentActivitiesInput } from "@/lib/audit/get-recent-activities";
export { fetchActivityFeedServer } from "@/lib/audit/fetch-activity-feed.server";
export { splitActivityFeedLogs } from "@/lib/audit/split-activity-feed-logs";
export { auditCoverage, AUDIT_COVERAGE_SERVICE_FILES } from "@/lib/audit/coverage-contract";
export type { AuditCoverageModule } from "@/lib/audit/coverage-contract";
export { withAuditTransaction } from "@/lib/audit/transactional-record.server";
export type { AuditTransactionContext } from "@/lib/audit/transactional-record.server";
