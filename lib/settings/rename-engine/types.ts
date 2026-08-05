import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import type { RENAME_ENGINE_VERSION, RENAME_PLAN_VERSION } from "@/lib/settings/rename-engine/constants";

export type RenameOperationAction =
  | "replace_column"
  | "replace_json"
  | "migrate_key"
  | "insert_alias"
  | "custom";

export type RenameFilter = {
  columnEq?: Record<string, string>;
  statusIn?: string[];
  statusNotIn?: string[];
  excludeArchivedLavorazioni?: boolean;
};

export type RenameOperation = {
  id: string;
  action: RenameOperationAction;
  table: string;
  column?: string;
  jsonPath?: string;
  filter: RenameFilter;
  policy: "live" | "protected";
  handler?: string;
};

export type RenamePlan = {
  engineVersion: typeof RENAME_ENGINE_VERSION;
  planVersion: typeof RENAME_PLAN_VERSION;
  kind: SettingsRenameKind;
  entityId?: string;
  entityKey?: string;
  oldLabel: string;
  newLabel: string;
  correlationId: string;
  operationIds: string[];
};

export type RenameImpactItem = {
  operationId: string;
  table: string;
  policy: "live" | "protected";
  updatable: number;
  protected: number;
  total: number;
};

export type RenameImpact = {
  items: RenameImpactItem[];
  totalUpdatable: number;
  totalProtected: number;
  totalScanned: number;
};

export type RenameJobStatus =
  | "draft"
  | "previewed"
  | "validated"
  | "approved"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "reversed";

export type RenameExecutionMode = "full" | "configuration_only" | "live_propagation";

export type PropagationStatus = "pending_propagation" | "propagated" | "configuration_only";

export type RenameJobSource = "user_rename" | "repair" | "retry";

export type HealthCheckStatus = "healthy" | "warning" | "failed";

export type HealthCheckItem = {
  name: string;
  status: HealthCheckStatus;
  expected?: number;
  actual?: number;
  message?: string;
};

export type HealthCheckResult = {
  status: HealthCheckStatus;
  checks: HealthCheckItem[];
};

export type RenameMetrics = {
  kind: SettingsRenameKind;
  entity_id?: string;
  entity_key?: string;
  entity: string;
  records_scanned: number;
  records_updated: number;
  records_protected: number;
  duration_ms: number;
  warnings: number;
  execution_mode: RenameExecutionMode;
  batched: boolean;
  execution_id?: string;
  propagation_status?: PropagationStatus;
};

export type ValidationCheckStatus = "pass" | "fail" | "warning";

export type ValidationResult = {
  status: "ok" | "blocked" | "warning";
  checks: Array<{ name: string; status: ValidationCheckStatus; message?: string }>;
};

export type RenameConflictReport = {
  blocked: boolean;
  conflicts: Array<{ code: string; message: string }>;
};

export type SemanticCollisionItem = {
  existingLabel: string;
  newLabel: string;
  similarity: number;
};

export type SemanticCollisionReport = {
  hasCollision: boolean;
  items: SemanticCollisionItem[];
};

export type ReverseEligibility = {
  eligible: boolean;
  reason?: string;
};

export type EntitySnapshot = {
  entity_id?: string;
  entity_key?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export type RenameExecutionPolicy = {
  max_records_sync: number;
  batch_size: number;
  timeout_seconds: number;
};
