import type { OrdineFornitoreStatus, OrdineFornitoreStatusLegacy } from "@/lib/ordini-fornitori/types";

const LEGACY_STATUS_MAP: Record<OrdineFornitoreStatusLegacy, OrdineFornitoreStatus> = {
  confermato: "inviato",
  spedito: "in_consegna",
  ricevuto: "consegnato",
};

export function normalizeOrdineFornitoreStatus(raw: string): OrdineFornitoreStatus {
  if (raw === "bozza" || raw === "inviato" || raw === "in_consegna" || raw === "consegnato" || raw === "annullato") {
    return raw;
  }
  if (raw in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[raw as OrdineFornitoreStatusLegacy];
  }
  return "bozza";
}

export const ORDINE_FORNITORE_STATUS_IN_CORSO: readonly OrdineFornitoreStatus[] = [
  "bozza",
  "inviato",
  "in_consegna",
];

export const ORDINE_FORNITORE_STATUS_ARCHIVIO: readonly OrdineFornitoreStatus[] = ["consegnato"];

/** Transizioni consentite via updateStatus (consegnato solo via ricezione). */
export const ORDINE_FORNITORE_STATUS_TRANSITIONS: Record<
  OrdineFornitoreStatus,
  readonly OrdineFornitoreStatus[]
> = {
  bozza: ["inviato", "annullato"],
  inviato: ["in_consegna", "annullato"],
  in_consegna: ["annullato"],
  consegnato: [],
  annullato: [],
};

export function canTransitionOrdineFornitoreStatus(
  from: OrdineFornitoreStatus,
  to: OrdineFornitoreStatus,
): boolean {
  if (from === to) return true;
  return ORDINE_FORNITORE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function ordineFornitoreResidualQty(quantita: number, quantitaRicevuta: number): number {
  return Math.max(0, quantita - quantitaRicevuta);
}

export function ordineFornitoreIsFullyReceived(
  righe: ReadonlyArray<{ quantita: number; quantitaRicevuta: number }>,
): boolean {
  return righe.length > 0 && righe.every((r) => r.quantitaRicevuta >= r.quantita);
}
