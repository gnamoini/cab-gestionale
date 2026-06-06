import type { AuthError } from "@supabase/supabase-js";
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
