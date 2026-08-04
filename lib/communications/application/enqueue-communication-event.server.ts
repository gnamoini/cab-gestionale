import "server-only";

import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";

export async function enqueueCommunicationEvent(input: {
  domainEventType: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  actorId?: string | null;
}): Promise<string | null> {
  const client = createCommunicationAdminClient();
  const { data, error } = await client.rpc("cab_enqueue_communication_outbox", {
    p_domain_event_type: input.domainEventType,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_idempotency_key: input.idempotencyKey,
    p_actor_id: input.actorId ?? null,
    p_payload: input.payload ?? {},
    p_company_id: null,
  });

  if (error) {
    console.warn("[communications] enqueue failed:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}
