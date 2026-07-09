"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import type { InvoiceRow, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";
import { dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";

function avgDsoDays(invoices: InvoiceRow[]): number {
  const paid = invoices.filter((i) => i.status === "pagata" && i.data_scadenza);
  if (paid.length === 0) return 0;
  const total = paid.reduce((acc, i) => {
    const due = new Date(i.data_scadenza!).getTime();
    const emit = new Date(i.data_emissione).getTime();
    return acc + Math.max(0, Math.round((due - emit) / 86_400_000));
  }, 0);
  return Math.round(total / paid.length);
}

export function FatturazioneReportSection({
  invoices,
  preventiviBilling,
}: {
  invoices: InvoiceRow[];
  preventiviBilling: PreventivoBillingStatusRow[];
}) {
  const metrics = useMemo(() => {
    const nc = invoices.filter((i) => i.document_type === "nota_credito").length;
    const fatturato = invoices
      .filter((i) => i.status !== "annullata" && i.document_type !== "nota_credito")
      .reduce((s, i) => s + i.totale, 0);
    const convertiti = preventiviBilling.filter((p) => p.stato_fatturazione === "totalmente_fatturato").length;
    const totPrev = preventiviBilling.length || 1;
    return {
      dso: avgDsoDays(invoices),
      nc,
      fatturato,
      conversione: Math.round((convertiti / totPrev) * 100),
    };
  }, [invoices, preventiviBilling]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>DSO medio</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.dso} gg</p>
        <p className={dsTypoSmall}>Giorni emissione → scadenza (fatture pagate)</p>
      </ShellCard>
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Note di credito</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.nc}</p>
      </ShellCard>
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Fatturato</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{formatInvoiceMoney(metrics.fatturato)}</p>
      </ShellCard>
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Conversione preventivi</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.conversione}%</p>
      </ShellCard>
    </div>
  );
}
