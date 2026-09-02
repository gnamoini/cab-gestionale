import { isOrdineSpesaVariaRiga } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import type { OrdineFornitoreRecord, OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

export type OrdineFornitoreDeliveryLineInput = {
  riga_id: string;
  quantita_ricevuta_target: number;
};

export type OrdineFornitoreDeliveryStockLine = {
  rigaId: string;
  codice: string;
  descrizione: string;
  quantitaRicevuta: number;
  target: number;
  ricambioId: string | null;
};

export type OrdineFornitoreDeliveryStockBlock = {
  rigaId: string;
  codice: string;
  descrizione: string;
  delta: number;
  reason: "no_ricambio_id";
};

/** Righe con incremento ricevuta ma senza ricambio collegato — bloccanti per apply_stock. */
export function findOrdineFornitoreStockBlockedLines(
  lines: readonly OrdineFornitoreDeliveryStockLine[],
): OrdineFornitoreDeliveryStockBlock[] {
  return lines
    .filter((l) => l.target > l.quantitaRicevuta && !l.ricambioId)
    .map((l) => ({
      rigaId: l.rigaId,
      codice: l.codice,
      descrizione: l.descrizione,
      delta: l.target - l.quantitaRicevuta,
      reason: "no_ricambio_id" as const,
    }));
}

export function ordineFornitoreDeliveryHasStockDelta(
  lines: readonly OrdineFornitoreDeliveryStockLine[],
): boolean {
  return lines.some((l) => l.target > l.quantitaRicevuta && Boolean(l.ricambioId));
}

export function validateOrdineFornitoreDeliveryRequest(args: {
  status: OrdineFornitoreStatus;
  righe: OrdineFornitoreRecord["righe"];
  lines: readonly OrdineFornitoreDeliveryLineInput[];
  applyStock: boolean;
}): string | null {
  if (args.status !== "in_consegna") {
    return "Ricezione consentita solo su ordini in consegna.";
  }

  const magazzinoRighe = args.righe.filter((r) => !isOrdineSpesaVariaRiga(r.meta));

  for (const line of args.lines) {
    const riga = magazzinoRighe.find((r) => r.id === line.riga_id);
    if (!riga) return `Riga non trovata: ${line.riga_id}`;
    const qtyReceived = riga.quantitaRicevuta ?? 0;
    if (line.quantita_ricevuta_target < qtyReceived) {
      return "La quantità ricevuta non può diminuire.";
    }
    if (line.quantita_ricevuta_target > riga.quantita) {
      return "La quantità ricevuta supera la quantità ordinata.";
    }
  }

  if (args.applyStock) {
    const stockLines: OrdineFornitoreDeliveryStockLine[] = args.lines.map((line) => {
      const riga = magazzinoRighe.find((r) => r.id === line.riga_id)!;
      return {
        rigaId: line.riga_id,
        codice: riga.codice,
        descrizione: riga.descrizione,
        quantitaRicevuta: riga.quantitaRicevuta ?? 0,
        target: line.quantita_ricevuta_target,
        ricambioId: riga.ricambioId,
      };
    });
    const blocked = findOrdineFornitoreStockBlockedLines(stockLines);
    if (blocked.length > 0) {
      const labels = blocked.map((b) => b.codice || b.descrizione).join(", ");
      return `Impossibile caricare il magazzino: collega un ricambio per ${labels}.`;
    }
  }

  return null;
}

export function ordineFornitoreDeliveryWouldComplete(
  righe: OrdineFornitoreRecord["righe"],
  lines: readonly OrdineFornitoreDeliveryLineInput[],
): boolean {
  const magazzinoRighe = righe.filter((r) => !isOrdineSpesaVariaRiga(r.meta));
  const targetById = new Map(lines.map((l) => [l.riga_id, l.quantita_ricevuta_target]));
  return magazzinoRighe.every((r) => (targetById.get(r.id) ?? r.quantitaRicevuta ?? 0) >= r.quantita);
}
