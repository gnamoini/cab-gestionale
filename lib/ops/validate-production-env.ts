import { readSupabasePublicEnv } from "@/lib/env/supabase-public";
import type { ProductionReadinessFinding } from "@/lib/production/production-readiness-types";

export type OpsEnvFinding = ProductionReadinessFinding;

function isProductionDeployTarget(env: NodeJS.ProcessEnv): boolean {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? "";
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  return nodeEnv === "production" || vercelEnv === "production";
}

function isTruthyEnv(v: string | undefined): boolean {
  return v?.trim() === "1" || v?.trim().toLowerCase() === "true";
}

function push(
  list: OpsEnvFinding[],
  finding: OpsEnvFinding,
): void {
  list.push(finding);
}

/** Validazione env operativa (build/CI/deploy). */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): {
  blockers: OpsEnvFinding[];
  warnings: OpsEnvFinding[];
  productionTarget: boolean;
} {
  const blockers: OpsEnvFinding[] = [];
  const warnings: OpsEnvFinding[] = [];
  const productionTarget = isProductionDeployTarget(env);
  const inCi = env.CI === "true" || env.CI === "1";

  if (productionTarget && isTruthyEnv(env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS)) {
    push(blockers, {
      id: "ops-env-pilot-production",
      category: "ops-env",
      message: "NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS attivo in ambiente production.",
    });
  }

  if (productionTarget && isTruthyEnv(env.NEXT_PUBLIC_STAGING_PUBLIC)) {
    push(blockers, {
      id: "ops-env-staging-public-production",
      category: "ops-env",
      message: "NEXT_PUBLIC_STAGING_PUBLIC attivo in ambiente production.",
    });
  }

  const pub = readSupabasePublicEnv();
  if (!pub) {
    push(warnings, {
      id: "ops-env-supabase-public-missing",
      category: "ops-env",
      message: "NEXT_PUBLIC_SUPABASE_URL o ANON_KEY mancanti o vuoti.",
    });
  } else if (
    pub.url.includes("placeholder") ||
    pub.anonKey.length < 20
  ) {
    push(warnings, {
      id: "ops-env-supabase-public-suspicious",
      category: "ops-env",
      message: "Variabili Supabase pubbliche sospette (placeholder o key troppo corta).",
    });
  }

  if (productionTarget && isTruthyEnv(env.NEXT_PUBLIC_CAB_OPS_WARN)) {
    push(warnings, {
      id: "ops-env-ops-warn-production",
      category: "ops-env",
      message: "NEXT_PUBLIC_CAB_OPS_WARN=1 in production (aumenta volume log).",
    });
  }

  if (productionTarget && env.NEXT_PUBLIC_OBS_LOG_LEVEL?.trim().toLowerCase() === "debug") {
    push(warnings, {
      id: "ops-env-obs-debug-production",
      category: "ops-env",
      message: "NEXT_PUBLIC_OBS_LOG_LEVEL=debug in production.",
    });
  }

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  if (vercelEnv === "preview" && !isTruthyEnv(env.NEXT_PUBLIC_STAGING_PUBLIC)) {
    push(warnings, {
      id: "ops-env-preview-without-staging-slice",
      category: "ops-env",
      message: "VERCEL_ENV=preview senza NEXT_PUBLIC_STAGING_PUBLIC (preview non isolato come staging).",
    });
  }

  if (inCi && !env.SMOKE_ADMIN_EMAIL?.trim()) {
    push(warnings, {
      id: "ops-env-smoke-creds-missing-ci",
      category: "ops-env",
      message: "SMOKE_ADMIN_EMAIL assente in CI — smoke Playwright sarà SKIP o fallirà.",
    });
  }

  if (productionTarget && env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    push(blockers, {
      id: "ops-env-service-role-in-runtime-env",
      category: "ops-env",
      message:
        "SUPABASE_SERVICE_ROLE_KEY presente in env runtime production (deve restare solo su GitHub Actions / server local).",
    });
  }

  return { blockers, warnings, productionTarget };
}
