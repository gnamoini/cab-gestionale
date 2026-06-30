import type { OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";
import {
  ordineFornitoreStatusBadgeClass,
  ordineFornitoreStatusLabel,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";

export function OrdineFornitoreStatusBadge({ status }: { status: OrdineFornitoreStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ordineFornitoreStatusBadgeClass(status)}`}
      aria-label={`Stato ordine: ${ordineFornitoreStatusLabel(status)}`}
    >
      {ordineFornitoreStatusLabel(status)}
    </span>
  );
}

export function formatOrdineFornitoreDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}
