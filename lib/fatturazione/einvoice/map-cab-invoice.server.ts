import "server-only";

import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";
import type { DocumentFiscalContext } from "@/lib/vat/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type InvoiceLinkRow = {
  source_type: string;
  source_id: string;
  source_label: string | null;
  metadata: Record<string, unknown> | null;
};

type PaymentTermRow = {
  code: string | null;
  days: number | null;
  split_schedule: unknown;
};

function mapLinks(links: InvoiceLinkRow[]): CanonicalElectronicInvoice["references"] {
  const linkedDocuments = links.map((l) => ({
    type: l.source_type as "ddt" | "ordine" | "preventivo" | "consuntivo" | "lavorazione",
    id: l.source_id,
    label: l.source_label ?? l.source_type,
    date: l.metadata?.date ? String(l.metadata.date) : null,
    number: l.metadata?.number ? String(l.metadata.number) : null,
  }));
  return { linkedDocuments };
}

function buildFiscalContext(customer: Record<string, unknown> | null): DocumentFiscalContext {
  const split = Boolean(customer?.split_payment);
  const esig = customer?.esigibilita_iva;
  return {
    split_payment: split,
    esigibilita_iva: esig === "I" || esig === "D" || esig === "S" ? esig : undefined,
  };
}

/** Bounded server reads — no N+1, no per-line queries. */
export async function buildCanonicalInvoice(
  sb: SupabaseClient,
  documentId: string,
): Promise<CanonicalElectronicInvoice> {
  const { data: inv, error } = await sb
    .from("invoices")
    .select(
      "id, document_type, origine, company_id, invoice_snapshot, customer_snapshot, payment_term_id, sdi_status",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error || !inv) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  const snapshot = (inv.invoice_snapshot ?? {}) as InvoiceEmissionSnapshot;
  if (!snapshot.cedente && !snapshot.documento) {
    throw new Error("INVOICE_SNAPSHOT_MISSING");
  }

  const { data: links } = await sb
    .from("invoice_links")
    .select("source_type, source_id, source_label, metadata")
    .eq("invoice_id", documentId);

  let payment: CanonicalElectronicInvoice["payment"] = null;
  if (inv.payment_term_id) {
    const { data: term } = await sb
      .from("payment_terms")
      .select("code, days, split_schedule")
      .eq("id", inv.payment_term_id)
      .maybeSingle<PaymentTermRow>();
    if (term) {
      payment = [
        {
          paymentConditions: term.code ?? "TP02",
          paymentMethod: "MP05",
          dueDate: null,
          amount: null,
          iban: null,
        },
      ];
    }
  }

  const customer = (inv.customer_snapshot ?? snapshot.cliente ?? {}) as Record<string, unknown>;
  const fiscalContext = buildFiscalContext(customer);

  return buildCanonicalFromSnapshot(inv.id, inv.company_id, snapshot, {
    documentType: inv.document_type,
    origine: inv.origine,
    references: mapLinks((links ?? []) as InvoiceLinkRow[]),
    payment,
    fiscalContext,
    publicAdministration: customer.cig || customer.cup
      ? { cig: customer.cig ? String(customer.cig) : null, cup: customer.cup ? String(customer.cup) : null }
      : null,
  });
}
