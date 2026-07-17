import {
  PRIMARY_ENV_KEY_NAMES,
  SECONDARY_ENV_KEY_NAMES,
  getGeminiConfigurationStatus,
  resolveGeminiApiKeysFromEnv,
} from "@/lib/ai/gemini-api-keys";

export type GeminiEnvKeyPresence = {
  present: boolean;
  length: number;
};

export type GeminiResolverDiagnostics = {
  entriesEnvKeyCount: number;
  geminiKeysViaEntries: boolean;
  geminiKeysViaDirect: boolean;
  directPresence: Record<string, GeminiEnvKeyPresence>;
  resolvedKeyCount: number;
  mismatchEntriesVsDirect: boolean;
};

function keyPresence(name: string): GeminiEnvKeyPresence {
  const value = process.env[name]?.trim() ?? "";
  return { present: value.length > 0, length: value.length };
}

function resolveViaEntriesScan(): string[] {
  const entries = Object.entries(process.env) as [string, string | undefined][];
  const lookup = (names: readonly string[]) => {
    for (const name of names) {
      const hit = entries.find(([key]) => key === name);
      const value = hit?.[1]?.trim();
      if (value) return value;
    }
    return null;
  };
  const keys: string[] = [];
  const push = (key: string | null) => {
    if (!key || keys.includes(key)) return;
    keys.push(key);
  };
  push(lookup(PRIMARY_ENV_KEY_NAMES));
  push(lookup(SECONDARY_ENV_KEY_NAMES));
  return keys;
}

function resolveViaDirectLookup(): string[] {
  const keys: string[] = [];
  const push = (name: string) => {
    const value = process.env[name]?.trim();
    if (value && !keys.includes(value)) keys.push(value);
  };
  for (const name of PRIMARY_ENV_KEY_NAMES) push(name);
  for (const name of SECONDARY_ENV_KEY_NAMES) push(name);
  return keys;
}

export function buildGeminiResolverDiagnostics(): GeminiResolverDiagnostics {
  const directPresence: Record<string, GeminiEnvKeyPresence> = {};
  for (const name of [...PRIMARY_ENV_KEY_NAMES, ...SECONDARY_ENV_KEY_NAMES]) {
    directPresence[name] = keyPresence(name);
  }
  const viaEntries = resolveViaEntriesScan();
  const viaDirect = resolveViaDirectLookup();
  const resolved = resolveGeminiApiKeysFromEnv();
  return {
    entriesEnvKeyCount: Object.keys(process.env).length,
    geminiKeysViaEntries: viaEntries.length > 0,
    geminiKeysViaDirect: viaDirect.length > 0,
    directPresence,
    resolvedKeyCount: resolved.length,
    mismatchEntriesVsDirect: viaEntries.length !== viaDirect.length,
  };
}

export function buildGeminiOpsConfigurationPayload(modelId: string) {
  const resolver = buildGeminiResolverDiagnostics();
  const status = getGeminiConfigurationStatus(undefined, { modelId });
  const primaryLength =
    status.primarySource != null ? (resolver.directPresence[status.primarySource]?.length ?? 0) : 0;

  return {
    runtime: "nodejs" as const,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    sdk: "@ai-sdk/google",
    provider: "google",
    model: modelId,
    configured: status.configured,
    primarySource: status.primarySource,
    secondaryConfigured: status.secondaryConfigured,
    formatValid: status.formatValid,
    keyLength: primaryLength,
    missing: status.missing,
    reachable: status.reachable,
    clientCreated: status.configured,
    resolver,
    lastInitializationError: null as string | null,
  };
}

export function resolveConfigurationErrorType(input: {
  configured: boolean;
  keyLength: number;
  formatValid: boolean;
}): "CONFIG_NOT_FOUND" | "CONFIG_EMPTY" | "CONFIG_INVALID_FORMAT" | null {
  if (!input.configured && input.keyLength === 0) return "CONFIG_NOT_FOUND";
  if (input.configured && input.keyLength === 0) return "CONFIG_EMPTY";
  if (input.configured && !input.formatValid) return "CONFIG_INVALID_FORMAT";
  return null;
}
