import "server-only";

import { billingEligibility, type BillingSourceType } from "@/lib/fatturazione/ciclo-attivo/billing-eligibility.server";
import { ddtToInvoiceDraft } from "@/lib/fatturazione/ddt-to-invoice-draft";
import { buildPreventivoInvoiceLink, preventivoToInvoiceDraftRows } from "@/lib/fatturazione/preventivo-to-invoice-draft";
import type { InvoiceCreateInput } from "@/lib/fatturazione/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export { CICLO_ATTIVO_ERROR } from "@/lib/fatturazione/ciclo-attivo/error-codes";

export type CreateInvoiceFromSourcesInput = {
  sources: Array<{ type: BillingSourceType; id: string }>;
  customerId: string | null;
  clienteLabel: string;
  customerSnapshot: Record<string, unknown>;
  dataEmissione: string;
  defaultVatCodeId: string;
  preventivoRecords?: Parameters<typeof preventivoToInvoiceDraftRows>[0][];
  ddtDetails?: Parameters<typeof ddtToInvoiceDraft>[0][];
};

/** Server writer: eligibility + reconstruct rows. Client sends source UUIDs only. */
export async function createInvoiceFromSources(
  client: SupabaseClient,
  input: CreateInvoiceFromSourcesInput,
): Promise<{ id: string } | { error: string; code: string }> {
  if (input.sources.length === 0) {
    return { error: "Nessuna sorgente", code: "SOURCE_NOT_FOUND" };
  }

  const rows: InvoiceCreateInput["rows"] = [];
  const links: InvoiceCreateInput["links"] = [];
  let origine: InvoiceCreateInput["origine"] = "manuale";
  let recommendedTd = "TD01";

  for (const src of input.sources) {
    const elig = await billingEligibility(client, src.type, src.id);
    if (!elig.eligible) {
      return { error: elig.reason, code: elig.reason };
    }
    recommendedTd = elig.recommended_document_type;
    if (src.type === "preventivo" || src.type === "consuntivo") {
      const rec = input.preventivoRecords?.find((p) => p.id === src.id);
      if (!rec) return { error: "Preventivo non caricato", code: "SOURCE_NOT_FOUND" };
      rows.push(...preventivoToInvoiceDraftRows(rec, src.id, input.defaultVatCodeId));
      links.push(buildPreventivoInvoiceLink(src.id, elig.remaining));
      origine = src.type === "consuntivo" ? "preventivo" : src.type === "preventivo" && input.sources.length > 1 ? "multi_preventivo" : "preventivo";
    } else if (src.type === "ddt") {
      const ddt = input.ddtDetails?.find((d) => d.document.id === src.id);
      if (!ddt) return { error: "DDT non caricato", code: "SOURCE_NOT_FOUND" };
      const draft = ddtToInvoiceDraft(ddt, input.defaultVatCodeId);
      rows.push(...draft.rows);
      links.push(...draft.links);
      origine = "manuale";
    }
  }

  if (rows.length === 0) {
    return { error: "Nessuna riga fatturabile", code: "NOT_BILLABLE" };
  }

  const { data, error } = await client.rpc("create_invoice_with_rows_and_links", {
    p_payload: {
      origine,
      status: "bozza",
      customer_id: input.customerId,
      cliente_label: input.clienteLabel,
      customer_snapshot: input.customerSnapshot,
      data_emissione: input.dataEmissione,
      rows,
      links,
      meta: { fattura_pa_tipo_documento: recommendedTd },
    },
  });
  if (error) return { error: error.message, code: error.message.split(":")[0] ?? "CREATE_FAILED" };
  const id = String(data ?? "");
  if (!id) return { error: "Creazione fattura non riuscita", code: "CREATE_FAILED" };

  const trueOrigine =
    input.sources.length === 1
      ? input.sources[0]!.type === "consuntivo"
        ? "consuntivo"
        : input.sources[0]!.type
      : input.sources.every((s) => s.type === "ddt")
        ? "ddt"
        : origine;
  if (trueOrigine !== "manuale" && trueOrigine !== origine) {
    await client.rpc("invoice_set_draft_origine", { p_invoice_id: id, p_origine: trueOrigine });
  }
  return { id };
}
