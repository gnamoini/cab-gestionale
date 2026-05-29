"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { resolveSignInEmailLegacy } from "@/src/lib/auth/resolve-sign-in-email";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 30;

type RateBucket = { count: number; windowStart: number };

const rateByIp = new Map<string, RateBucket>();

function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateByIp.get(ip);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    rateByIp.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_ATTEMPTS_PER_WINDOW;
}

export type ResolveLoginEmailResult = { email: string };

/**
 * Risolve username → email Auth prima del sign-in.
 * Usa service role (RPC non esposto ad anon) + rate limit per IP.
 */
export async function resolveLoginEmailAction(identifier: string): Promise<ResolveLoginEmailResult> {
  const trimmed = identifier.trim();
  if (!trimmed) return { email: "" };
  if (trimmed.includes("@")) return { email: trimmed.toLowerCase() };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(ip)) {
    return { email: "" };
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return { email: resolveSignInEmailLegacy(trimmed) };
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
  if (!error && (data === null || data === "")) {
    return { email: "" };
  }

  return { email: resolveSignInEmailLegacy(trimmed) };
}
