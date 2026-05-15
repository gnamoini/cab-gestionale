import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase con sessione utente (cookie) per Server Actions / Route Handlers.
 */
export async function createSupabaseServerUserClient() {
  const env = assertSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* set da contesto read-only: ignorare */
        }
      },
    },
  });
}
