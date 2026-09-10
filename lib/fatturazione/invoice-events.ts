import type { InvoiceEventRow } from "@/src/types/supabase-tables";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export const INVOICE_EVENT_CATEGORY_LABELS: Record<InvoiceEventRow["event_category"], string> = {
  document: "Documento",
  payment: "Pagamento",
  sdi: "SdI",
  accounting: "Contabilità",
  audit: "Audit",
};

export function formatInvoiceEventLabel(event: Pick<InvoiceEventRow, "event_type" | "event_category">): string {
  const map: Record<string, string> = {
    draft_created: "Bozza creata",
    status_changed: "Stato aggiornato",
    customer_sent: "Inviata al cliente",
    payment_registered: "Pagamento registrato",
    payment_allocated: "Allocazione pagamento",
    credit_note_created: "Nota di credito creata",
    debit_note_created: "Nota di debito creata",
    export: "Export CSV",
    sdi_generated: "XML FatturaPA generato",
    sdi_submitted: "Inviata a SdI",
    invoice_sdi_rejected: "Scarto SdI — reversal tecnico",
    invoice_sdi_accepted: "SdI accettata",
    invoice_sdi_delivered: "SdI consegnata",
    invoice_sdi_delivery_failed: "Impossibilità di consegna SdI",
    invoice_sdi_submitted: "Inviata a SdI",
    invoice_finalized: "Documento finalizzato",
    invoice_number_assigned: "Numero assegnato",
    payment_schedule_created: "Piano scadenze creato",
    accounting_entry_created: "Scrittura contabile",
    accounting_reversed: "Scrittura stornata",
    open_items_neutralized: "Partite neutralizzate",
  };
  return map[event.event_type] ?? event.event_type.replaceAll("_", " ");
}

export function sortInvoiceEventsAsc(events: InvoiceEventRow[]): InvoiceEventRow[] {
  return [...events].sort((a, b) => {
    const t = a.created_at.localeCompare(b.created_at);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

export type AppendBillingEventInput = {
  entityType: string;
  entityId: string;
  aggregateType: string;
  aggregateId: string;
  invoiceId: string | null;
  eventCategory: InvoiceEventRow["event_category"];
  eventType: string;
  correlationId?: string;
  causationId?: string | null;
  payload?: Record<string, unknown>;
};

/** SSOT TS per INSERT su invoice_events — delega a RPC append_billing_event. */
export async function appendBillingEvent(
  input: AppendBillingEventInput,
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const c = getBrowserSupabase();
  const { data, error } = await c.rpc("append_billing_event", {
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_invoice_id: input.invoiceId,
    p_event_category: input.eventCategory,
    p_event_type: input.eventType,
    p_correlation_id: input.correlationId ?? undefined,
    p_causation_id: input.causationId ?? undefined,
    p_payload: input.payload ?? {},
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, eventId: String(data ?? "") };
}

export const INVOICE_TIMELINE_PAGE_SIZE = 50;
