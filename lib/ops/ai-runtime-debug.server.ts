import "server-only";

import { countIndexedBootstrapKeys } from "@/lib/ai/runtime/env-reader";

/** Env names inspected by raw runtime debug — no Gemini imports. */
export const AI_RUNTIME_DEBUG_ENV_NAMES = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY_SECONDARY",
  "GOOGLE_GENERATIVE_AI_API_KEY_SECONDARY",
  "AI_MASTER_KEY_ENCRYPTION_KEY",
  "AI_DEFAULT_PROVIDER",
  "AI_MODEL_GOOGLE",
  "AI_TIMEOUT_MS",
  "AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED",
  "CRON_SECRET",
] as const;

export type AiRuntimeDebugEnvPresence = {
  exists: boolean;
  length: number;
};

function presenceFromRaw(raw: string | undefined): AiRuntimeDebugEnvPresence {
  const trimmed = raw?.trim() ?? "";
  return { exists: trimmed.length > 0, length: trimmed.length };
}

function readReflect(name: string): string | undefined {
  return Reflect.get(process.env, name) as string | undefined;
}

/** Raw runtime env probe — absolute truth for RCA (never returns secret values). */
export function buildAiRuntimeDebugPayload() {
  const env: Record<string, AiRuntimeDebugEnvPresence> = {};
  for (const name of AI_RUNTIME_DEBUG_ENV_NAMES) {
    env[name] = presenceFromRaw(readReflect(name));
  }

  const primary = "GOOGLE_GENERATIVE_AI_API_KEY";
  const reflectRaw = readReflect(primary);
  const bracketRaw = process.env[primary];
  let dotRaw: string | undefined;
  try {
    // ponytail: static dot access — may be build-inlined undefined on Vercel
    dotRaw = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  } catch {
    dotRaw = undefined;
  }

  return {
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    runtime: "nodejs" as const,
    nodeVersion: process.version,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    projectId: process.env.VERCEL_PROJECT_ID ?? null,
    indexedBootstrapKeyCounts: countIndexedBootstrapKeys(),
    env,
    accessMethods: {
      reflectGet: { [primary]: presenceFromRaw(reflectRaw) },
      bracketAccess: { [primary]: presenceFromRaw(bracketRaw) },
      dotAccess: { [primary]: presenceFromRaw(dotRaw) },
    },
  };
}
