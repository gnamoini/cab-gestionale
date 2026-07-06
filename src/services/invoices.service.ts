"use client";

import {
  BILLING_CUSTOMERS_COLUMNS,
  INVOICE_LINKS_COLUMNS,
  INVOICE_PAYMENTS_COLUMNS,
  INVOICE_ROWS_COLUMNS,
  INVOICES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { fetchInvoiceListPayload } from "@/lib/fatturazione/fatturazione-fetch";
import type { InvoiceCreateInput, InvoiceDetail, InvoicePaymentInput } from "@/lib/fatturazione/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  BillingCustomerRow,
  InvoiceLineRow,
  InvoiceLinkRow,
  InvoicePaymentRow,
  InvoiceRow,
} from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "invoices";
const PAYMENT_ENTITA = "invoice_payments";

/** Stati eliminabili (hard delete) — allineato a RLS `cap_invoices_delete`. */
export const INVOICE_DELETABLE_STATUSES = new Set<InvoiceRow["status"]>(["bozza", "da_verificare"]);

export function invoiceIsDeletable(status: InvoiceRow["status"]): boolean {
  return INVOICE_DELETABLE_STATUSES.has(status);
}

async function sb() {
  return getBrowserSupabase();
}

function cleanPayload(input: InvoiceCreateInput): Record<string, unknown> {
  return {
    origine: input.origine,
    status: input.status,
    customer_id: input.customer_id ?? null,
    cliente_label: input.cliente_label.trim(),
    customer_snapshot: input.customer_snapshot ?? {},
    data_emissione: input.data_emissione,
    data_scadenza: input.data_scadenza ?? null,
    note: input.note ?? null,
    admin_notes: input.admin_notes ?? null,
    rows: input.rows.map((r) => ({
      ...r,
      descrizione: r.descrizione.trim(),
      sconto_percent: r.sconto_percent ?? 0,
      iva_percent: r.iva_percent ?? 22,
      ricambio_id: r.ricambio_id ?? null,
      lavorazione_id: r.lavorazione_id ?? null,
      preventivo_id: r.preventivo_id ?? null,
      meta: r.meta ?? {},
    })),
    links: (input.links ?? []).map((l) => ({
      ...l,
      allocated_imponibile: l.allocated_imponibile ?? 0,
      allocated_iva: l.allocated_iva ?? 0,
      meta: l.meta ?? {},
    })),
  };
}

export const invoicesService = {
  async getList() {
    try {
      const c = await sb();
      return fetchInvoiceListPayload(c);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getCustomers(): Promise<ServiceResult<BillingCustomerRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("billing_customers").select(BILLING_CUSTOMERS_COLUMNS).order("cliente_label");
      if (error) return err(error.message);
      return success((data ?? []) as BillingCustomerRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getDetail(id: string): Promise<ServiceResult<InvoiceDetail>> {
    try {
      const c = await sb();
      const { data: invoice, error } = await c.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!invoice) return err("Fattura non trovata.");
      const [rows, links, payments] = await Promise.all([
        c.from("invoice_rows").select(INVOICE_ROWS_COLUMNS).eq("invoice_id", id),
        c.from("invoice_links").select(INVOICE_LINKS_COLUMNS).eq("invoice_id", id),
        c.from("invoice_payments").select(INVOICE_PAYMENTS_COLUMNS).eq("invoice_id", id).order("data", { ascending: false }),
      ]);
      if (rows.error) return err(rows.error.message);
      if (links.error) return err(links.error.message);
      if (payments.error) return err(payments.error.message);
      return success({
        invoice: invoice as InvoiceRow,
        rows: (rows.data ?? []) as InvoiceLineRow[],
        links: (links.data ?? []) as InvoiceLinkRow[],
        payments: (payments.data ?? []) as InvoicePaymentRow[],
      });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: InvoiceCreateInput): Promise<ServiceResult<InvoiceDetail>> {
    try {
      if (!input.cliente_label.trim()) return err("Cliente obbligatorio.");
      if (input.rows.length === 0) return err("Aggiungi almeno una riga fattura.");
      const c = await sb();
      const { data, error } = await c.rpc("create_invoice_with_rows_and_links", {
        p_payload: cleanPayload(input),
      });
      if (error) return err(error.message);
      const id = String(data ?? "");
      if (!id) return err("Creazione fattura non riuscita.");
      const detail = await invoicesService.getDetail(id);
      if (!detail.success || !detail.data) return detail;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "CREATE",
        payload: auditSnapshot(detail.data.invoice),
      });
      return detail;
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateDraft(
    id: string,
    patch: Partial<Pick<InvoiceRow, "cliente_label" | "customer_snapshot" | "data_emissione" | "data_scadenza" | "note" | "admin_notes" | "status">>,
    expectedUpdatedAt?: string,
  ): Promise<ServiceResult<InvoiceRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Fattura non trovata.");
      const b = before as InvoiceRow;
      if (b.status !== "bozza" && b.status !== "da_verificare") return err("Solo le bozze possono essere modificate.");
      let q = c.from("invoices").update(patch).eq("id", id);
      if (expectedUpdatedAt) q = q.eq("updated_at", expectedUpdatedAt);
      const { data, error } = await q.select(INVOICES_COLUMNS).single();
      if (error) return err(error.message);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, data),
      });
      return success(data as InvoiceRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateDraftWithRows(id: string, input: InvoiceCreateInput): Promise<ServiceResult<InvoiceDetail>> {
    try {
      if (!input.cliente_label.trim()) return err("Cliente obbligatorio.");
      if (input.rows.length === 0) return err("Aggiungi almeno una riga fattura.");
      const c = await sb();
      const before = await invoicesService.getDetail(id);
      const { data, error } = await c.rpc("update_invoice_draft_with_rows", {
        p_invoice_id: id,
        p_payload: cleanPayload(input),
      });
      if (error) return err(error.message);
      const outId = String(data ?? id);
      const detail = await invoicesService.getDetail(outId);
      if (!detail.success || !detail.data) return detail;
      if (before.success && before.data) {
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "UPDATE",
          payload: auditDiff(before.data.invoice, detail.data.invoice),
        });
      }
      return detail;
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async issue(id: string, status: "emessa" | "inviata" = "emessa"): Promise<ServiceResult<InvoiceRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Fattura non trovata.");
      const b = before as InvoiceRow;
      if (b.status === "annullata" || b.status === "pagata") return err("Stato fattura non modificabile.");
      const { data, error } = await c.from("invoices").update({ status }).eq("id", id).select(INVOICES_COLUMNS).single();
      if (error) return err(error.message);
      await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "UPDATE", payload: auditDiff(before, data) });
      return success(data as InvoiceRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async registerPayment(input: InvoicePaymentInput): Promise<ServiceResult<InvoiceDetail>> {
    try {
      const c = await sb();
      const before = await invoicesService.getDetail(input.invoice_id);
      const { data, error } = await c.rpc("register_invoice_payment", { p_payload: input });
      if (error) return err(error.message);
      const detail = await invoicesService.getDetail(input.invoice_id);
      if (!detail.success || !detail.data) return detail;
      const paymentId = String(data ?? "");
      if (paymentId) {
        await writeModificaLog(c, {
          entita: PAYMENT_ENTITA,
          entita_id: paymentId,
          azione: "CREATE",
          payload: auditSnapshot({ ...input, id: paymentId }),
        });
      }
      if (before.success && before.data) {
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: input.invoice_id,
          azione: "UPDATE",
          payload: auditDiff(before.data.invoice, detail.data.invoice),
        });
      }
      return detail;
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async cancel(id: string, reason: string): Promise<ServiceResult<InvoiceRow>> {
    try {
      const c = await sb();
      const { data: before } = await c.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
      const { error } = await c.rpc("cancel_invoice", { p_invoice_id: id, p_reason: reason });
      if (error) return err(error.message);
      const { data, error: e1 } = await c.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
      if (e1) return err(e1.message);
      if (!data) return err("Fattura non trovata.");
      await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "UPDATE", payload: auditDiff(before, data) });
      return success(data as InvoiceRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Hard delete bozze — cascade righe/link; irreversibile. */
  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const detail = await invoicesService.getDetail(id);
      if (!detail.success || !detail.data) return err(detail.error ?? "Fattura non trovata.");
      const inv = detail.data.invoice;
      if (!invoiceIsDeletable(inv.status)) {
        return err("Solo le bozze possono essere eliminate. Per fatture emesse usa Annulla.");
      }
      if (detail.data.payments.length > 0) {
        return err("Impossibile eliminare: sono presenti pagamenti registrati.");
      }
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot(inv),
      });
      const { error } = await c.from("invoices").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
