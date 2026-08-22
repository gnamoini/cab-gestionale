import {
  ordineFornitoreResidualQty,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";
import type { OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

export type OrdineFornitoreInTransitRigaInput = {
  ricambioId: string | null;
  quantita: number;
  quantitaRicevuta: number;
  ordineStatus: OrdineFornitoreStatus;
};

export type OrdineFornitoreInTransitDetailRow = {
  ordineId: string;
  rigaId: string;
  numero: string;
  status: OrdineFornitoreStatus;
  qtyInTransit: number;
};

/** Qty in consegna per singolo ricambio da righe ordine in_consegna. */
export function computeInTransitQtyForRicambio(
  righe: ReadonlyArray<OrdineFornitoreInTransitRigaInput>,
  ricambioId: string,
): number {
  let sum = 0;
  for (const r of righe) {
    if (r.ordineStatus !== "in_consegna") continue;
    if (!r.ricambioId || r.ricambioId !== ricambioId) continue;
    sum += ordineFornitoreResidualQty(r.quantita, r.quantitaRicevuta);
  }
  return sum;
}

/** Aggrega qty in transito per più ricambi. */
export function aggregateInTransitByRicambioId(
  rows: ReadonlyArray<{
    ricambioId: string;
    qtyInTransit: number;
  }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (!row.ricambioId || row.qtyInTransit <= 0) continue;
    out[row.ricambioId] = (out[row.ricambioId] ?? 0) + row.qtyInTransit;
  }
  return out;
}

export function formatMagazzinoScortaWithInTransit(disponibile: number, inTransit: number): string {
  if (inTransit <= 0) return String(disponibile);
  return `${disponibile} (${inTransit})`;
}

export function magazzinoScortaAriaLabel(disponibile: number, inTransit: number): string {
  if (inTransit <= 0) return `${disponibile} disponibili`;
  return `${disponibile} disponibili, ${inTransit} in consegna`;
}
