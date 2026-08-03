import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** ponytail: CAB single-tenant — upgrade: company_id da contesto entità */
export async function resolveSingleCompanyId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.from("companies").select("id").limit(1).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}
