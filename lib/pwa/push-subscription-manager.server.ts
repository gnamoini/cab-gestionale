import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const INVALID_STATUS = new Set([404, 410]);

/** Centralizza revoca subscription push invalide (404/410). */
export async function revokePushSubscription(
  client: SupabaseClient,
  input: { companyId: string; endpoint: string },
): Promise<void> {
  await client
    .from("push_subscriptions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("company_id", input.companyId)
    .eq("endpoint", input.endpoint)
    .is("revoked_at", null);
}

export function isPushSubscriptionInvalidStatus(statusCode: number | undefined): boolean {
  return statusCode !== undefined && INVALID_STATUS.has(statusCode);
}

/** Revoca subscription stale (last_seen oltre soglia giorni). */
export async function revokeStalePushSubscriptions(
  client: SupabaseClient,
  staleDays = 90,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);
  const { data, error } = await client
    .from("push_subscriptions")
    .update({ revoked_at: new Date().toISOString() })
    .is("revoked_at", null)
    .lt("last_seen_at", cutoff.toISOString())
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
