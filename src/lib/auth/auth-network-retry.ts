import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { isInvalidRefreshAuthMessage } from "@/src/lib/auth/clear-invalid-auth-session";

export function isTransientNetworkAuthError(err: AuthError | Error): boolean {
  const m = `${err.name} ${err.message}`.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("timeout") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

/** Invalida sessione solo su errori refresh/JWT irrecuperabili — non su 401/403 generici. */
export function shouldClearSessionOnAuthError(err: AuthError | Error): boolean {
  return isInvalidRefreshAuthMessage(err.message);
}

/** JWT scaduto / sessione rinnovabile — tentare refreshSession prima di invalidare. */
export function isRecoverableAuthError(err: AuthError | Error): boolean {
  if (shouldClearSessionOnAuthError(err)) return false;
  if (isTransientNetworkAuthError(err)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("jwt expired") ||
    m.includes("token expired") ||
    m.includes("auth session missing")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry solo errori rete/transitori; mai su 401/403. */
export async function withAuthNetworkRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; backoffMs?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 1;
  const backoffMs = options?.backoffMs ?? 300;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const err = e instanceof Error ? e : new Error(String(e));
      if (shouldClearSessionOnAuthError(err) || !isTransientNetworkAuthError(err) || attempt >= maxRetries) {
        throw e;
      }
      await delay(backoffMs);
    }
  }
  throw lastError;
}

export type AuthUserRetryMode = "server" | "client";

type AuthUserResult = {
  data: { user: User | null };
  error: AuthError | null;
};

/** SSOT getUser con retry rete / refresh sessione (server) o soft retry (client). */
export async function getUserWithAuthRetry(
  supabase: SupabaseClient,
  mode: AuthUserRetryMode = "server",
): Promise<AuthUserResult> {
  if (mode === "client") {
    const first = await supabase.auth.getUser();
    if (!first.error) return first;
    if (shouldClearSessionOnAuthError(first.error) || !isTransientNetworkAuthError(first.error)) {
      return first;
    }
    await delay(300);
    return supabase.auth.getUser();
  }

  const first = await supabase.auth.getUser();
  if (!first.error && first.data?.user) return first;
  if (first.error && shouldClearSessionOnAuthError(first.error)) return first;

  if (first.error && isRecoverableAuthError(first.error)) {
    await supabase.auth.refreshSession();
    const afterRefresh = await supabase.auth.getUser();
    if (!afterRefresh.error && afterRefresh.data?.user) return afterRefresh;
    if (afterRefresh.error && shouldClearSessionOnAuthError(afterRefresh.error)) return afterRefresh;
    if (afterRefresh.error && isTransientNetworkAuthError(afterRefresh.error)) {
      await delay(300);
      return supabase.auth.getUser();
    }
    return afterRefresh;
  }

  if (first.error && isTransientNetworkAuthError(first.error)) {
    await delay(300);
    return supabase.auth.getUser();
  }
  return first;
}
