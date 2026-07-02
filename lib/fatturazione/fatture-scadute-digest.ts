import { buildInvoiceKpi } from "@/lib/fatturazione/invoice-calculations";
import type { InvoiceRow } from "@/src/types/supabase-tables";

export type FattureScaduteDigestPayload = {
  dateYmd: string;
  count: number;
  createdAt: string;
};

export function buildFattureScaduteDigestPayload(
  invoices: readonly InvoiceRow[],
  now = new Date(),
): FattureScaduteDigestPayload | null {
  const kpi = buildInvoiceKpi(invoices, now);
  if (kpi.scadute <= 0) return null;
  return {
    dateYmd: now.toISOString().slice(0, 10),
    count: kpi.scadute,
    createdAt: now.toISOString(),
  };
}

export function formatFattureScaduteDigestBody(payload: FattureScaduteDigestPayload): string {
  const n = payload.count;
  const label = n === 1 ? "fattura scaduta" : "fatture scadute";
  return `${n} ${label} con residuo da incassare. Apri Fatturazione per gestire i pagamenti.`;
}

export function fattureScaduteDigestStoreKey(dateYmd: string): string {
  return `fatt-scad:${dateYmd}`;
}

export function buildFattureScaduteDigestNotification(payload: FattureScaduteDigestPayload): {
  kind: "fatture_scadute_digest";
  id: string;
  dateYmd: string;
  count: number;
  createdAt: string;
} {
  return {
    kind: "fatture_scadute_digest",
    id: fattureScaduteDigestStoreKey(payload.dateYmd),
    dateYmd: payload.dateYmd,
    count: payload.count,
    createdAt: payload.createdAt,
  };
}
