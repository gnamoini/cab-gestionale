import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";

/** Dominio email riservato agli utenti smoke (mai account operativi reali). */
export const SMOKE_DEDICATED_EMAIL_DOMAIN = "@cab-gestionale.ci";

function isTruthy(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function isLocalSmokeBaseUrl(baseUrl: string | undefined): boolean {
  const raw = baseUrl?.trim() || "";
  if (!raw) return true;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/** True se il target Supabase è marcato come production (stesso DB clienti reali). */
export function isSmokeProductionSupabaseTarget(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isTruthy(env.SMOKE_TARGET_IS_PRODUCTION)) return true;

  const canonical = env.SMOKE_PRODUCTION_SUPABASE_URL?.trim();
  if (!canonical) return false;

  const current = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!current) {
    try {
      const { url } = assertSupabasePublicEnv();
      return normalizeSupabaseUrl(url) === normalizeSupabaseUrl(canonical);
    } catch {
      return false;
    }
  }

  return normalizeSupabaseUrl(current) === normalizeSupabaseUrl(canonical);
}

/** True se l'email è un account smoke dedicato (non admin/operatore reale). */
export function isDedicatedSmokeEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  if (normalized.endsWith(SMOKE_DEDICATED_EMAIL_DOMAIN)) return true;

  const allowList = (process.env.SMOKE_DEDICATED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(normalized);
}

export type SmokeMutationGateResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Gate per spec Playwright che creano/modificano dati.
 * Su production: richiede opt-in esplicito + credenziali dedicate + service role (teardown).
 */
export function evaluateSmokeMutationGate(
  env: NodeJS.ProcessEnv = process.env,
): SmokeMutationGateResult {
  const email = env.SMOKE_ADMIN_EMAIL?.trim() ?? "";
  const password = env.SMOKE_ADMIN_PASSWORD?.trim() ?? "";

  if (!email || !password) {
    return {
      allowed: false,
      reason: "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti.",
    };
  }

  const productionDb = isSmokeProductionSupabaseTarget(env);
  const remoteApp = !isLocalSmokeBaseUrl(env.SMOKE_BASE_URL);

  if (!productionDb && !remoteApp) {
    return { allowed: true };
  }

  if (!isDedicatedSmokeEmail(email)) {
    return {
      allowed: false,
      reason:
        "Su database production servono credenziali dedicate (@cab-gestionale.ci). " +
        "Non usare account admin/operatore reali. Esegui: npx tsx scripts/ensure-local-smoke-secrets.ts",
    };
  }

  if (!isTruthy(env.SMOKE_ALLOW_PRODUCTION_MUTATIONS)) {
    return {
      allowed: false,
      reason:
        "Test mutanti su production DB bloccati. Imposta SMOKE_ALLOW_PRODUCTION_MUTATIONS=1 " +
        "solo dopo aver creato utente smoke dedicato e verificato teardown (npm run smoke:cleanup).",
    };
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      allowed: false,
      reason:
        "SUPABASE_SERVICE_ROLE_KEY richiesta per teardown automatico su production dopo smoke mutanti.",
    };
  }

  return { allowed: true };
}

export function assertSmokeMutationAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const gate = evaluateSmokeMutationGate(env);
  if (!gate.allowed) {
    throw new Error(`[smoke-guard] ${gate.reason}`);
  }
}
