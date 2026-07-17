import type { AiProviderId, BootstrapKeyCandidate } from "@/lib/ai/runtime/types";

/** ponytail: Reflect.get — unico accesso env autorizzato nel runtime AI. */
export function readRuntimeSecret(name: string): string {
  const raw = Reflect.get(process.env, name) as string | undefined;
  return raw?.trim() ?? "";
}

export const SUPPORTED_BOOTSTRAP_PROVIDERS = ["google", "openai", "anthropic", "mistral"] as const;

/** Max index scan — anti-abuse cap, not a business limit. */
export const BOOTSTRAP_KEY_INDEX_MAX = 100;

const LEGACY_GOOGLE_ENV_MAP: { envName: string; slot: string; priority: number }[] = [
  { envName: "GOOGLE_GENERATIVE_AI_API_KEY", slot: "google-legacy-01", priority: 5 },
  { envName: "GEMINI_API_KEY", slot: "google-legacy-02", priority: 6 },
  { envName: "GOOGLE_API_KEY", slot: "google-legacy-03", priority: 7 },
  { envName: "GEMINI_API_KEY_SECONDARY", slot: "google-legacy-04", priority: 8 },
  { envName: "GOOGLE_GENERATIVE_AI_API_KEY_SECONDARY", slot: "google-legacy-05", priority: 9 },
];

/** @deprecated Use readRuntimeBootstrapKeys */
export const LEGACY_GOOGLE_KEY_ENV_NAMES = LEGACY_GOOGLE_ENV_MAP.map((e) => e.envName);

function bootstrapEnvName(provider: string, index: number): string {
  const nn = String(index).padStart(2, "0");
  return `AI_PROVIDER_${provider.toUpperCase()}_KEY_${nn}`;
}

function slotForIndexedKey(provider: AiProviderId, index: number): string {
  return `${provider}-${String(index).padStart(2, "0")}`;
}

/**
 * Indexed env scan — no Object.keys(process.env).
 * Returns deduplicated bootstrap candidates (fingerprint dedup at ingest).
 */
export function readRuntimeBootstrapKeys(): BootstrapKeyCandidate[] {
  const out: BootstrapKeyCandidate[] = [];
  const seen = new Set<string>();

  for (const provider of SUPPORTED_BOOTSTRAP_PROVIDERS) {
    for (let i = 1; i <= BOOTSTRAP_KEY_INDEX_MAX; i++) {
      const envName = bootstrapEnvName(provider, i);
      const apiKey = readRuntimeSecret(envName);
      if (!apiKey || seen.has(apiKey)) continue;
      seen.add(apiKey);
      out.push({
        envName,
        apiKey,
        provider: provider as AiProviderId,
        slot: slotForIndexedKey(provider as AiProviderId, i),
        priority: 10 + i,
        source: "env_bootstrap",
        managedBy: "runtime_sync",
      });
    }
  }

  for (const legacy of LEGACY_GOOGLE_ENV_MAP) {
    const apiKey = readRuntimeSecret(legacy.envName);
    if (!apiKey || seen.has(apiKey)) continue;
    seen.add(apiKey);
    out.push({
      envName: legacy.envName,
      apiKey,
      provider: "google",
      slot: legacy.slot,
      priority: legacy.priority,
      source: "env_bootstrap",
      managedBy: "runtime_sync",
    });
  }

  return out;
}

/** Debug helper: count of indexed bootstrap keys present per provider. */
export function countIndexedBootstrapKeys(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const provider of SUPPORTED_BOOTSTRAP_PROVIDERS) {
    let n = 0;
    for (let i = 1; i <= BOOTSTRAP_KEY_INDEX_MAX; i++) {
      if (readRuntimeSecret(bootstrapEnvName(provider, i))) n += 1;
    }
    counts[provider] = n;
  }
  return counts;
}

export function readRuntimeProviderDefault(): string {
  return readRuntimeSecret("AI_DEFAULT_PROVIDER") || "google";
}

export function readRuntimeModelForProvider(provider: string): string {
  const specific = readRuntimeSecret(`AI_MODEL_${provider.toUpperCase()}`);
  if (specific) return specific;
  if (provider === "google") {
    return readRuntimeSecret("GEMINI_MODEL_ID") || readRuntimeSecret("AI_MODEL_GOOGLE") || "gemini-3.5-flash";
  }
  return readRuntimeSecret("AI_MODEL_DEFAULT") || "gpt-4o-mini";
}

export function readRuntimeTimeoutMs(): number {
  const raw = readRuntimeSecret("AI_TIMEOUT_MS") || readRuntimeSecret("REPORT_ANALYSIS_LLM_TIMEOUT_MS");
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 90_000;
}

export function isBootstrapFallbackEnabled(): boolean {
  const raw = readRuntimeSecret("AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED");
  if (!raw) return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}

/** @deprecated Use readRuntimeBootstrapKeys */
export function readLegacyGoogleKeys(): { envName: string; apiKey: string; slot: string }[] {
  return readRuntimeBootstrapKeys()
    .filter((c) => c.provider === "google")
    .map((c) => ({ envName: c.envName, apiKey: c.apiKey, slot: c.slot }));
}
