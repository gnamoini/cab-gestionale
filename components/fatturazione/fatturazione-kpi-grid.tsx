"use client";

import type { InvoiceKpi } from "@/lib/fatturazione/types";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";

function KpiCard({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 text-left sm:p-4 ${onClick ? "cursor-pointer transition hover:border-[color:var(--cab-primary)]" : ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</p>
      {sub ? <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">{sub}</p> : null}
    </Tag>
  );
}

export function FatturazioneKpiGrid({
  kpi,
  onScaduteClick,
  onDaIncassareClick,
}: {
  kpi: InvoiceKpi;
  onScaduteClick?: () => void;
  onDaIncassareClick?: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <KpiCard label="Emesse mese" value={kpi.emesseMese} sub="escluse bozze" />
      <KpiCard label="Da incassare" value={formatInvoiceMoney(kpi.daIncassare)} onClick={onDaIncassareClick} />
      <KpiCard label="Scadute" value={kpi.scadute} onClick={onScaduteClick} sub="con residuo" />
      <KpiCard label="Fatturato mese" value={formatInvoiceMoney(kpi.fatturatoMese)} />
      <KpiCard label="Fatturato anno" value={formatInvoiceMoney(kpi.fatturatoAnno)} />
      <KpiCard label="Clienti insoluti" value={kpi.clientiConInsoluti} />
    </div>
  );
}
