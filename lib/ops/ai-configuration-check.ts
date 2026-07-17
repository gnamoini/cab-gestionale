import { LEGACY_GOOGLE_KEY_ENV_NAMES } from "@/lib/ai/runtime/env-reader";
import type { ProductionReadinessFinding } from "@/lib/production/production-readiness-types";

export const AI_CONFIGURATION_CHECK_ID = "ops-env-gemini-not-configured";
export const AI_CONFIGURATION_FORMAT_WARNING_ID = "ops-env-gemini-format-suspicious";

function hasLegacyAiKeyInEnv(env: NodeJS.ProcessEnv): boolean {
  for (const name of LEGACY_GOOGLE_KEY_ENV_NAMES) {
    const raw = Reflect.get(env, name) as string | undefined;
    if (raw?.trim()) return true;
  }
  return false;
}

/** Gate deploy/CI: bootstrap env present (DB keys validated at runtime). */
export function checkAiConfigurationForProduction(env: NodeJS.ProcessEnv = process.env): {
  blockers: ProductionReadinessFinding[];
  warnings: ProductionReadinessFinding[];
} {
  const blockers: ProductionReadinessFinding[] = [];
  const warnings: ProductionReadinessFinding[] = [];
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? "";
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  const productionTarget = nodeEnv === "production" || vercelEnv === "production";
  if (!productionTarget) return { blockers, warnings };

  if (!hasLegacyAiKeyInEnv(env) && !env.AI_MASTER_KEY_ENCRYPTION_KEY?.trim()) {
    blockers.push({
      id: AI_CONFIGURATION_CHECK_ID,
      category: "ops-env",
      message:
        "Nessuna chiave AI bootstrap in production (GOOGLE_GENERATIVE_AI_API_KEY o AI_MASTER_KEY_ENCRYPTION_KEY per DB).",
    });
  } else if (!hasLegacyAiKeyInEnv(env) && env.AI_MASTER_KEY_ENCRYPTION_KEY?.trim()) {
    warnings.push({
      id: AI_CONFIGURATION_FORMAT_WARNING_ID,
      category: "ops-env",
      message:
        "Solo AI_MASTER_KEY_ENCRYPTION_KEY in env — verifica che ai_provider_keys contenga chiavi attive post-deploy.",
    });
  }

  return { blockers, warnings };
}
