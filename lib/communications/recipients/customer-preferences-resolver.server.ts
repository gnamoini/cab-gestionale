import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunicationPolicyDefinition } from "@/lib/communications/policy/communication-policy-catalog";
import { findPoliciesForDomainEvent } from "@/lib/communications/policy/communication-policy-catalog";

export type ClienteCommunicationPreferences = {
  receive_work_order_updates: boolean;
  receive_quotes: boolean;
  receive_maintenance_reminders: boolean;
};

const DEFAULT_PREFS: ClienteCommunicationPreferences = {
  receive_work_order_updates: true,
  receive_quotes: true,
  receive_maintenance_reminders: true,
};

export async function loadClienteCommunicationPreferences(
  client: SupabaseClient,
  clienteId: string | null,
): Promise<ClienteCommunicationPreferences> {
  if (!clienteId) return { ...DEFAULT_PREFS };
  const { data } = await client
    .from("cliente_communication_preferences")
    .select("receive_work_order_updates, receive_quotes, receive_maintenance_reminders")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_PREFS };
  return {
    receive_work_order_updates: data.receive_work_order_updates !== false,
    receive_quotes: data.receive_quotes !== false,
    receive_maintenance_reminders: data.receive_maintenance_reminders !== false,
  };
}

export function isPolicyAllowedByClientePrefs(
  policy: CommunicationPolicyDefinition,
  prefs: ClienteCommunicationPreferences,
): boolean {
  if (!policy.preferenceKey) return true;
  return prefs[policy.preferenceKey] !== false;
}

export function resolveActivePolicies(
  domainEvent: string,
  payload: Record<string, unknown>,
  prefs: ClienteCommunicationPreferences,
): CommunicationPolicyDefinition[] {
  return findPoliciesForDomainEvent(domainEvent, payload).filter((p) =>
    isPolicyAllowedByClientePrefs(p, prefs),
  );
}
