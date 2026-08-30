"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { FatturaStatusBadge, formatInvoiceDate, formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { invoiceSdiStatus } from "@/lib/fatturazione/invoice-status";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import { dsTableActionBtnPrimary, dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";

export function FatturazioneSdiSection({
  invoices,
  onOpenDetail,
}: {
  invoices: InvoiceRow[];
  onOpenDetail: (id: string) => void;
}) {
  const feInvoices = invoices.filter(
    (i) => i.document_type !== "nota_credito" && i.status !== "bozza" && i.status !== "annullata",
  );

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Fatturazione elettronica (SdI)</h2>
      <p className={`${dsTypoSmall} mt-1`}>Stato invio per fatture emesse. Adapter HTTP pluggable via `fe-sdi`.</p>
      <ul className={`mt-4 ${LIST_DIVIDER_UL}`}>
        {feInvoices.slice(0, 50).map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-2 py-3 min-w-0 flex-nowrap sm:flex-wrap">
            <div>
              <p className="font-medium">{invoiceDisplayNumber(inv)} · {inv.cliente_label}</p>
              <p className={dsTypoSmall}>
                {formatInvoiceDate(inv.data_emissione)} · {formatInvoiceMoney(inv.totale)} · SdI: {invoiceSdiStatus(inv)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FatturaStatusBadge status={inv.status} />
              <button type="button" className={dsTableActionBtnPrimary} onClick={() => onOpenDetail(inv.id)}>
                Dettaglio
              </button>
            </div>
          </li>
        ))}
      </ul>
    </ShellCard>
  );
}
