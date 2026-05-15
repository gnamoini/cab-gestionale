import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "@/lib/env/supabase-public";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export type SupabaseMiddlewareResult = {
  supabase: SupabaseClient | null;
  response: NextResponse;
};

/**
 * Client Supabase per il middleware Next.js: aggiorna i cookie di sessione
 * e consente a `getUser()` di vedere la sessione reale.
 * Usa solo `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * Se mancano → `supabase` è `null` (nessun client creato).
 */
export function createSupabaseMiddlewareClient(request: NextRequest): SupabaseMiddlewareResult {
  const env = readSupabasePublicEnv();
  if (!env) {
    return { supabase: null, response: NextResponse.next({ request }) };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions | undefined);
        });
      },
    },
  });

  return { supabase, response };
}
