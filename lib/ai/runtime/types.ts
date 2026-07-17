export type AiProviderId = "google" | "openai" | "anthropic" | "mistral";

export type RuntimeKeySource = "env_bootstrap" | "admin_ui" | "migration";
export type ManagedBy = "runtime_sync" | "administrator";
export type DisabledReason = "env_removed" | "manual_admin" | "provider_invalid" | "security_rotation";
export type IngestMode = "NEW" | "EXISTING" | "RECOVERY";

export type BootstrapKeyCandidate = {
  envName: string;
  apiKey: string;
  provider: AiProviderId;
  slot: string;
  priority: number;
  source: RuntimeKeySource;
  managedBy: ManagedBy;
};

export type SyncPreviewResult = {
  syncConfidence: boolean;
  wouldCreate: string[];
  wouldUpdate: string[];
  wouldDisable: string[];
  warnings: string[];
};

export type ProviderTestResult = {
  ok: boolean;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  /** Provider unreachable (network/5xx) — do not disable existing keys */
  unreachable?: boolean;
};

export type AiKeyStatus =
  | "healthy"
  | "degraded"
  | "rate_limited"
  | "cooldown"
  | "invalid"
  | "disabled";

export type AiErrorCode =
  | "AI_CONFIG_MISSING"
  | "AI_KEY_INVALID"
  | "AI_RATE_LIMIT"
  | "AI_QUOTA_EXCEEDED"
  | "AI_PROVIDER_DOWN"
  | "AI_TIMEOUT"
  | "AI_UNKNOWN_ERROR";

export type ResolvedAiKey = {
  id: string;
  provider: AiProviderId;
  slot: string;
  apiKey: string;
  priority: number;
  weight: number;
  status: AiKeyStatus;
  cooldownUntil: Date | null;
  fingerprint: string;
  source: "database" | "legacy_env";
  requestsTotal: number;
  successTotal: number;
  failureTotal: number;
  rateLimitTotal: number;
  latencyMsAvg: number | null;
  lastUsedAt: Date | null;
};

export type AiConfigurationStatus = {
  configured: boolean;
  provider: AiProviderId;
  modelId: string;
  activeKeyCount: number;
  primarySource: "database" | "legacy_env" | null;
  degradedMode: boolean;
};

export type AiServiceResult<T> =
  | { ok: true; data: T; meta: AiCallMeta }
  | { ok: false; code: AiErrorCode; message: string; meta?: Partial<AiCallMeta> };

export type AiCallMeta = {
  provider: AiProviderId;
  modelId: string;
  keyId: string | null;
  keySlot: string | null;
  keySource: "database" | "legacy_env" | null;
  durationMs: number;
  failoverCount: number;
  operation: string;
};

export type AiProviderKeyRow = {
  id: string;
  provider: string;
  slot: string;
  encrypted_key: string;
  key_fingerprint: string;
  enabled: boolean;
  priority: number;
  weight: number;
  status: string;
  cooldown_until: string | null;
  requests_total: number;
  success_total: number;
  failure_total: number;
  rate_limit_total: number;
  latency_ms_sum: number;
  latency_ms_count: number;
  last_used_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  source?: RuntimeKeySource;
  managed_by?: ManagedBy;
  disabled_reason?: DisabledReason | null;
  rotation_replaced_by?: string | null;
};
