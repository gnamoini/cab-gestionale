"use client";

import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import {
  isRecoverableAuthError,
  isTransientNetworkAuthError,
  shouldClearSessionOnAuthError,
} from "@/src/lib/auth/auth-network-retry";

export type ReconcileReason =
  | "init"
  | "visibility"
  | "token_refreshed"
  | "manual"
  | "failsafe"
  | "auth_gate";

export type ReconcileResult =
  | { verdict: "valid"; user: User; debugId: number }
  | { verdict: "invalid"; reason: string; debugId: number }
  | { verdict: "pending"; error?: Error; debugId: number };

let debugIdCounter = 0;
let inFlightPromise: Promise<ReconcileResult> | null = null;

function nextDebugId(): number {
  debugIdCounter += 1;
  return debugIdCounter;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function getUserWithSoftRetry(sb: SupabaseClient): Promise<{
  data: { user: User | null };
  error: AuthError | null;
}> {
  const first = await sb.auth.getUser();
  if (!first.error) return first;
  if (shouldClearSessionOnAuthError(first.error) || !isTransientNetworkAuthError(first.error)) {
    return first;
  }
  await delay(300);
  return sb.auth.getUser();
}

async function runReconcile(sb: SupabaseClient): Promise<ReconcileResult> {
  const debugId = nextDebugId();

  const first = await getUserWithSoftRetry(sb);
  if (first.data?.user && !first.error) {
    return { verdict: "valid", user: first.data.user, debugId };
  }

  const firstErr = first.error;
  if (firstErr && shouldClearSessionOnAuthError(firstErr)) {
    return { verdict: "invalid", reason: firstErr.message, debugId };
  }

  if (firstErr && isRecoverableAuthError(firstErr)) {
    const { error: refreshErr } = await sb.auth.refreshSession();
    if (refreshErr && shouldClearSessionOnAuthError(refreshErr)) {
      return { verdict: "invalid", reason: refreshErr.message, debugId };
    }

    const second = await getUserWithSoftRetry(sb);
    if (second.data?.user && !second.error) {
      return { verdict: "valid", user: second.data.user, debugId };
    }

    const secondErr = second.error;
    if (secondErr && shouldClearSessionOnAuthError(secondErr)) {
      return { verdict: "invalid", reason: secondErr.message, debugId };
    }
    if (secondErr && isTransientNetworkAuthError(secondErr)) {
      return { verdict: "pending", error: secondErr, debugId };
    }
    if (!second.data?.user) {
      return {
        verdict: "invalid",
        reason: secondErr?.message ?? "no_user_after_refresh",
        debugId,
      };
    }
  }

  if (firstErr && isTransientNetworkAuthError(firstErr)) {
    return { verdict: "pending", error: firstErr, debugId };
  }

  if (!first.data?.user) {
    if (!firstErr) {
      return { verdict: "invalid", reason: "no_user", debugId };
    }
    return { verdict: "pending", error: firstErr, debugId };
  }

  return { verdict: "pending", debugId };
}

/** Riconciliazione sessione pura — single-flight in-flight, nessun side effect. */
export function reconcileSession(
  sb: SupabaseClient,
  _opts: { reason: ReconcileReason; force?: boolean },
): Promise<ReconcileResult> {
  if (inFlightPromise) {
    return inFlightPromise;
  }
  inFlightPromise = runReconcile(sb).finally(() => {
    inFlightPromise = null;
  });
  return inFlightPromise;
}

export function isReconcileInFlight(): boolean {
  return inFlightPromise != null;
}

/** Test-only: reset modulo coordinator. */
export function resetAuthSessionCoordinatorForTests(): void {
  inFlightPromise = null;
  debugIdCounter = 0;
}
