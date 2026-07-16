const PRIMARY_ENV_KEY_NAMES = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

const SECONDARY_ENV_KEY_NAMES = [
  "GEMINI_API_KEY_SECONDARY",
  "GOOGLE_GENERATIVE_AI_API_KEY_SECONDARY",
] as const;

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

/** Risolve chiavi API ordinate: primaria, poi secondaria (deduplicate). */
export function resolveGeminiApiKeysFromEnv(env: Record<string, string | undefined>): string[] {
  const keys: string[] = [];
  const push = (key: string | null) => {
    if (!key || keys.includes(key)) return;
    keys.push(key);
  };
  push(readFirstEnvKey(env, PRIMARY_ENV_KEY_NAMES));
  push(readFirstEnvKey(env, SECONDARY_ENV_KEY_NAMES));
  return keys;
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
