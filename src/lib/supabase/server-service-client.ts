import "server-only";

import { createClient } from "@supabase/supabase-js";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

/** Service-role client — never import from client components. */
export function createSupabaseServerServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = assertSupabaseServiceRoleKey();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
