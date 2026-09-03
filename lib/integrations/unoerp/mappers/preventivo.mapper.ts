import type { PreventivoRecord } from "@/lib/preventivi/types";
import { moneyStringFromNumber } from "@/lib/integrations/unoerp/monetary/decimal-policy";
import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";
import { hashCabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";

export function mapPreventivoToCabOwnedSnapshot(p: PreventivoRecord, sourceVersion: number): CabOwnedSnapshot {
  const lines = p.righeRicambi.map((r) => ({
    descrizione: r.descrizione,
    quantita: moneyStringFromNumber(r.quantita),
    prezzo: moneyStringFromNumber(r.prezzoUnitario),
    sconto: moneyStringFromNumber(r.scontoPercent),
  }));
  return {
    documentType: "preventivo",
    cabId: p.id,
    sourceVersion,
    customerLabel: p.cliente,
    lines,
    totale: moneyStringFromNumber(p.totaleFinale),
  };
}

/** Payload UnoERP: vuoto finché allowlist/discovery non definiscono i campi. */
export function mapPreventivoToUnoerpPayload(_p: PreventivoRecord): Record<string, unknown> {
  return {};
}

export function preventivoPayloadHash(p: PreventivoRecord, sourceVersion: number): string {
  return hashCabOwnedSnapshot(mapPreventivoToCabOwnedSnapshot(p, sourceVersion));
}
