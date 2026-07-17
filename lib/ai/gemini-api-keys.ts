const PRIMARY_ENV_KEY_NAMES = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

const SECONDARY_ENV_KEY_NAMES = [
  "GEMINI_API_KEY_SECONDARY",
  "GOOGLE_GENERATIVE_AI_API_KEY_SECONDARY",
] as const;

export { PRIMARY_ENV_KEY_NAMES, SECONDARY_ENV_KEY_NAMES };

export type GeminiConfigurationStatus = {
  configured: boolean;
  primarySource: string | null;
  secondaryConfigured: boolean;
  missing: string[];
  formatValid: boolean;
  reachable: boolean | null;
  modelId: string;
};

/** Google AI Studio keys usually start with AIza; AQ.* keys are Vertex-style and often invalid for Generative Language API. */
export function isGeminiApiKeyFormatValid(key: string | null | undefined): boolean {
  const trimmed = key?.trim() ?? "";
  if (!trimmed) return false;
  if (trimmed.startsWith("AIza") && trimmed.length >= 20) return true;
  if (/^AQ\./i.test(trimmed)) return false;
  if (trimmed === "test" || trimmed.length < 12) return false;
  return /^[A-Za-z0-9_-]{20,}$/.test(trimmed);
}

export function resolvePrimaryGeminiEnvSource(env?: Record<string, string | undefined>): string | null {
  if (env) {
    for (const name of PRIMARY_ENV_KEY_NAMES) {
      if (env[name]?.trim()) return name;
    }
    return null;
  }
  for (const name of PRIMARY_ENV_KEY_NAMES) {
    if (process.env[name]?.trim()) return name;
  }
  return null;
}

export function getGeminiConfigurationStatus(
  env?: Record<string, string | undefined>,
  options?: { modelId?: string; reachable?: boolean | null },
): GeminiConfigurationStatus {
  const keys = resolveGeminiApiKeysFromEnv(env);
  const primary = keys[0] ?? null;
  const primarySource = primary ? resolvePrimaryGeminiEnvSource(env) : null;
  const secondaryConfigured = keys.length > 1;
  const missing = primary ? [] : [...PRIMARY_ENV_KEY_NAMES];
  return {
    configured: Boolean(primary),
    primarySource,
    secondaryConfigured,
    missing,
    formatValid: isGeminiApiKeyFormatValid(primary),
    reachable: options?.reachable ?? null,
    modelId: options?.modelId ?? "gemini-3.5-flash",
  };
}

function readFirstEnvKey(
  env: Record<string, string | undefined>,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function resolveFromExplicitEnv(env: Record<string, string | undefined>): string[] {
  const keys: string[] = [];
  const push = (key: string | null) => {
    if (!key || keys.includes(key)) return;
    keys.push(key);
  };
  push(readFirstEnvKey(env, PRIMARY_ENV_KEY_NAMES));
  push(readFirstEnvKey(env, SECONDARY_ENV_KEY_NAMES));
  return keys;
}

/** Scan dinamico di process.env — direct lookup primario; entries come fallback. */
function resolveFromRuntimeProcessEnv(): string[] {
  const keys: string[] = [];
  const push = (key: string | null) => {
    if (!key || keys.includes(key)) return;
    keys.push(key);
  };
  const directLookup = (names: readonly string[]) => {
    for (const name of names) {
      const value = process.env[name]?.trim();
      if (value) return value;
    }
    return null;
  };
  push(directLookup(PRIMARY_ENV_KEY_NAMES));
  push(directLookup(SECONDARY_ENV_KEY_NAMES));
  if (keys.length > 0) return keys;

  const entries = Object.entries(process.env) as [string, string | undefined][];
  const entriesLookup = (names: readonly string[]) => {
    for (const name of names) {
      const hit = entries.find(([key]) => key === name);
      const value = hit?.[1]?.trim();
      if (value) return value;
    }
    return null;
  };
  push(entriesLookup(PRIMARY_ENV_KEY_NAMES));
  push(entriesLookup(SECONDARY_ENV_KEY_NAMES));
  return keys;
}

/** Risolve chiavi API ordinate: primaria, poi secondaria (deduplicate). */
export function resolveGeminiApiKeysFromEnv(env?: Record<string, string | undefined>): string[] {
  if (env) return resolveFromExplicitEnv(env);
  return resolveFromRuntimeProcessEnv();
}

export function geminiKeySlotForIndex(index: number): "primary" | "secondary" {
  return index === 0 ? "primary" : "secondary";
}

export function isGeminiAuthError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  return (
    upper.includes("401") ||
    upper.includes("403") ||
    upper.includes("API KEY") ||
    upper.includes("API_KEY") ||
    upper.includes("PERMISSION_DENIED") ||
    upper.includes("UNAUTHENTICATED") ||
    upper.includes("INVALID API KEY")
  );
}

export function isGeminiQuotaError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  return (
    upper.includes("429") ||
    upper.includes("RESOURCE_EXHAUSTED") ||
    upper.includes("QUOTA") ||
    upper.includes("RATE LIMIT") ||
    upper.includes("TOO MANY REQUESTS")
  );
}

export function isGeminiFailoverError(error: unknown): boolean {
  return isGeminiQuotaError(error) || isGeminiAuthError(error);
}

export function isGeminiModelUnavailableError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /no longer available/i.test(text) || /not found for api version/i.test(text);
}

export function isGeminiUnreachableError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  return (
    upper.includes("ECONNREFUSED") ||
    upper.includes("ENOTFOUND") ||
    upper.includes("ETIMEDOUT") ||
    upper.includes("FETCH FAILED") ||
    upper.includes("NETWORK") ||
    upper.includes("UNAVAILABLE") ||
    upper.includes("503") ||
    upper.includes("SERVICE UNAVAILABLE")
  );
}

/** ponytail: set esplicito — upgrade path: aggiungere ID deprecati qui, non euristica generica. */
export const DEPRECATED_GEMINI_REPORT_MODEL_IDS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

/** Remap modelli non più disponibili su chiavi nuove → default stabile. */
export function normalizeGeminiReportModelId(
  modelId: string | null | undefined,
  defaultModelId: string,
): string {
  const candidate = modelId?.trim() || defaultModelId;
  return DEPRECATED_GEMINI_REPORT_MODEL_IDS.has(candidate) ? defaultModelId : candidate;
}

/** Failover su lista chiavi — testabile senza server-only. */
export async function runWithGeminiApiKeysFailover<T>(
  keys: readonly string[],
  fn: (
    apiKey: string,
    meta: { keyIndex: number; keySlot: ReturnType<typeof geminiKeySlotForIndex> },
  ) => Promise<T>,
  options?: { notConfiguredMessage?: string },
): Promise<T> {
  if (keys.length === 0) {
    throw new Error(options?.notConfiguredMessage ?? "Gemini API key not configured");
  }

  let lastError: unknown;
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const apiKey = keys[keyIndex]!;
    const keySlot = geminiKeySlotForIndex(keyIndex);
    try {
      return await fn(apiKey, { keyIndex, keySlot });
    } catch (error) {
      lastError = error;
      const hasNext = keyIndex < keys.length - 1;
      if (!hasNext || !isGeminiFailoverError(error)) throw error;
      console.warn(`[gemini-client] failover ${keySlot} → ${geminiKeySlotForIndex(keyIndex + 1)}`);
    }
  }
  throw lastError;
}
