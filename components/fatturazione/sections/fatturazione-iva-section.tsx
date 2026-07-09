"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import { dsTypoSectionTitle } from "@/lib/ui/design-system";

export function FatturazioneIvaSection({ invoices }: { invoices: InvoiceRow[] }) {
  const summary = useMemo(() => {
    let imponibile = 0;
    let iva = 0;
    for (const inv of invoices) {
      if (inv.status === "annullata" || inv.document_type === "nota_credito") continue;
      imponibile += inv.imponibile;
      iva += inv.iva;
    }
    return { imponibile, iva, totale: imponibile + iva };
  }, [invoices]);

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Riepilogo IVA</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase text-[color:var(--cab-text-muted)]">Imponibile</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatInvoiceMoney(summary.imponibile)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[color:var(--cab-text-muted)]">IVA</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatInvoiceMoney(summary.iva)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[color:var(--cab-text-muted)]">Totale</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatInvoiceMoney(summary.totale)}</dd>
        </div>
      </dl>
    </ShellCard>
  );
}
