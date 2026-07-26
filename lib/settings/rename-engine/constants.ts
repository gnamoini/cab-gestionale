export const RENAME_ENGINE_VERSION = "rename-engine-v1" as const;
export const RENAME_PLAN_VERSION = 1 as const;

export const DEFAULT_RENAME_EXECUTION_POLICY = {
  max_records_sync: 5000,
  batch_size: 500,
  timeout_seconds: 120,
} as const;
