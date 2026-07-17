import { getGeminiConfigurationStatus } from "@/lib/ai/gemini-api-keys";
import type { ProductionReadinessFinding } from "@/lib/production/production-readiness-types";

const DEFAULT_GEMINI_MODEL_ID = "gemini-3.5-flash";

export const AI_CONFIGURATION_CHECK_ID = "ops-env-gemini-not-configured";
export const AI_CONFIGURATION_FORMAT_WARNING_ID = "ops-env-gemini-format-suspicious";

/** Gate deploy: Gemini configured in production target. */
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

  const status = getGeminiConfigurationStatus(env, {
    modelId: env.GEMINI_MODEL_ID?.trim() || DEFAULT_GEMINI_MODEL_ID,
  });
  if (!status.configured) {
    blockers.push({
      id: AI_CONFIGURATION_CHECK_ID,
      category: "ops-env",
      message:
        "Nessuna chiave Gemini in production (GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY).",
    });
  } else if (!status.formatValid) {
    warnings.push({
      id: AI_CONFIGURATION_FORMAT_WARNING_ID,
      category: "ops-env",
      message:
        "Chiave Gemini presente ma formato sospetto (es. AQ.* o troppo corta). Verifica su Google AI Studio (AIza…).",
    });
  }

  return { blockers, warnings };
}
