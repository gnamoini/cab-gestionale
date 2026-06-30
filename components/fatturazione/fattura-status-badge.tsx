import type { InvoiceStatus } from "@/src/types/supabase-tables";
import { invoiceStatusLabel } from "@/lib/fatturazione/fatturazione-advanced-filters";

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  bozza: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  da_verificare: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  emessa: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  inviata: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  parzialmente_pagata: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  pagata: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  scaduta: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  annullata: "bg-zinc-200 text-zinc-500 line-through dark:bg-zinc-900 dark:text-zinc-500",
};

export function FatturaStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status] ?? STATUS_CLASS.bozza}`}
    >
      {invoiceStatusLabel(status)}
    </span>
  );
}

export function formatInvoiceMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value ?? 0);
}

export function formatInvoiceDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}
