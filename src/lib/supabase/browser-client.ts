"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { applyRememberToCookiesToSet, type AuthCookieToSet } from "@/lib/auth/auth-cookie-options";
import { readAuthRememberPreference } from "@/lib/auth/auth-remember-preference";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";

export type { SupabaseClient, User };

let browserClient: SupabaseClient | null = null;

/**
 * Client Supabase browser (anon key + cookie session via `@supabase/ssr`).
 * Dipende solo da `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase è solo per il client");
  }
  const { url, anonKey } = assertSupabasePublicEnv();
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey, {
      cookies: {
        getAll() {
          return Object.entries(parse(document.cookie)).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet: AuthCookieToSet[]) {
          const remember = readAuthRememberPreference();
          const resolved = applyRememberToCookiesToSet(cookiesToSet, remember);
          resolved.forEach(({ name, value, options }) => {
            document.cookie = serialize(name, value, options);
          });
        },
      },
    });
  }
  return browserClient;
}
