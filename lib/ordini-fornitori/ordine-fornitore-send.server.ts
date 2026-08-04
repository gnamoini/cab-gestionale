import "server-only";

import { enqueueCommunicationEvent } from "@/lib/communications/application/enqueue-communication-event.server";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export async function enqueueOrdineFornitoreSendServer(ordineId: string): Promise<ServiceResult<{ outboxId: string | null }>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "write"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const idempotencyKey = `comm:supplier_order.send_requested:ordini_fornitori:${ordineId}:${Date.now()}`;

  const outboxId = await enqueueCommunicationEvent({
    domainEventType: "supplier_order.send_requested",
    entityType: "ordini_fornitori",
    entityId: ordineId,
    idempotencyKey,
    actorId: user?.id ?? null,
    payload: { ordine_numero: record.numero },
  });

  return success({ outboxId });
}
