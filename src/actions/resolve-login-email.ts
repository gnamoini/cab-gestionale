"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { clientKeyFromHeaders, isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";
import { validateResolveLoginIdentifier } from "@/lib/validation/admin-user-validation";

const LOGIN_RESOLVE_LIMIT: IpRateLimitConfig = {
  namespace: "login-resolve-email",
  windowMs: 5 * 60 * 1000,
  maxAttempts: 30,
};

export type ResolveLoginEmailResult = { email: string };

/**
 * Risolve username → email Auth prima del sign-in.
 * Usa service role (RPC non esposto ad anon) + rate limit per IP.
 * Fail-closed: nessun fallback sintetico su errore o assenza service role.
 */
export async function resolveLoginEmailAction(identifier: string): Promise<ResolveLoginEmailResult> {
  const trimmed = identifier.trim();
  const idErr = validateResolveLoginIdentifier(trimmed);
  if (idErr) return { email: "" };
  if (trimmed.includes("@")) return { email: trimmed.toLowerCase() };

  const h = await headers();
  const ip = clientKeyFromHeaders(h);
  if (await isIpRateLimited(LOGIN_RESOLVE_LIMIT, ip)) {
    return { email: "" };
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return { email: "" };
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("resolve_auth_email_for_login", {
    p_identifier: trimmed,
  });

  if (!error && typeof data === "string" && data.trim()) {
    return { email: data.trim().toLowerCase() };
  }

  return { email: "" };
}
