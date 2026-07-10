export const IMPORT_FILE_LIFECYCLE_STATUSES = [
  "uploaded",
  "stored",
  "quarantined",
  "expired",
  "deleted",
  // legacy — mapped during transition
  "processing",
  "processed",
  "failed",
  "cancelled",
] as const;

export type ImportFileLifecycleStatus = (typeof IMPORT_FILE_LIFECYCLE_STATUSES)[number];

export const IMPORT_EXECUTION_STATUSES = [
  "queued",
  "processing",
  "ai_processing",
  "needs_review",
  "ready_to_commit",
  "committing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ImportExecutionStatus = (typeof IMPORT_EXECUTION_STATUSES)[number];

export const IMPORT_AUDIT_EVENT_TYPES = [
  "FILE_UPLOADED",
  "FILE_QUARANTINED",
  "EXECUTION_QUEUED",
  "AI_STARTED",
  "AI_COMPLETED",
  "REVIEW_STARTED",
  "COMMIT_STARTED",
  "COMMIT_COMPLETED",
  "FAILED",
  "EXECUTION_STUCK_RECOVERED",
  "TENANT_ACCESS_DENIED",
  "FORCE_REPROCESS",
] as const;

export type ImportAuditEventType = (typeof IMPORT_AUDIT_EVENT_TYPES)[number];

export const IMPORT_AUDIT_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type ImportAuditSeverity = (typeof IMPORT_AUDIT_SEVERITIES)[number];

export const IMPORT_EXECUTION_FEATURES = [
  "ordine_fornitore",
  "listino_pdf",
  "listino_columns",
  "listino_execute",
  "magazzino_categoria",
  "document_capture",
  "erp_spreadsheet",
] as const;

export type ImportExecutionFeature = (typeof IMPORT_EXECUTION_FEATURES)[number];

export type ValidationIssueSeverity = "info" | "warning" | "blocking";

export type ValidationIssue = {
  field: string;
  code: string;
  message: string;
  severity: ValidationIssueSeverity;
};

export type BusinessValidationResult = {
  status: "ok" | "needs_review" | "blocked";
  aiConfidence?: number;
  businessConfidence: number;
  issues: ValidationIssue[];
};

export type ImportCommitContext = {
  companyId: string;
  userId: string;
  executionId: string;
  correlationId: string;
  importFileId?: string;
};

export type CommitResult = {
  entityType: string;
  entityId: string;
  idempotent?: boolean;
};
