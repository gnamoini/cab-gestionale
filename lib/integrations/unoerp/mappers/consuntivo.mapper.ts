import type { PreventivoRecord } from "@/lib/preventivi/types";
import { moneyStringFromNumber } from "@/lib/integrations/unoerp/monetary/decimal-policy";
import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";
import { hashCabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";

export function mapConsuntivoToCabOwnedSnapshot(p: PreventivoRecord, sourceVersion: number): CabOwnedSnapshot {
  const lines = p.righeRicambi.map((r) => ({
    descrizione: r.descrizione,
    quantita: moneyStringFromNumber(r.quantita),
    prezzo: moneyStringFromNumber(r.prezzoUnitario),
    sconto: moneyStringFromNumber(r.scontoPercent),
  }));
  return {
    documentType: "consuntivo",
    cabId: p.id,
    sourceVersion,
    customerLabel: p.cliente,
    lines,
    totale: moneyStringFromNumber(p.totaleFinale),
  };
}

export function mapConsuntivoToUnoerpPayload(_p: PreventivoRecord): Record<string, unknown> {
  return {};
}

export function consuntivoPayloadHash(p: PreventivoRecord, sourceVersion: number): string {
  return hashCabOwnedSnapshot(mapConsuntivoToCabOwnedSnapshot(p, sourceVersion));
}
