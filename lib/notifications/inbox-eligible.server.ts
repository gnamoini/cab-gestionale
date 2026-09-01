import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-side SSOT inbox eligibility via DB RPC (user session context). */
export async function resolveNotificationInboxEligible(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc("notification_inbox_eligible");
  if (error) return false;
  return Boolean(data);
}

export async function resolveNotificationStaffInboxEligible(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc("notification_staff_inbox_eligible");
  if (error) return false;
  return Boolean(data);
}
