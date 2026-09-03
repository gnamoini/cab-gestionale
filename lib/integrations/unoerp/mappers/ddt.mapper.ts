import type { DdtDetail } from "@/lib/ddt/types";
import { moneyStringFromNumber } from "@/lib/integrations/unoerp/monetary/decimal-policy";
import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";
import { hashCabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";

export function mapDdtToCabOwnedSnapshot(d: DdtDetail, sourceVersion: number): CabOwnedSnapshot {
  const doc = d.document;
  return {
    documentType: "ddt",
    cabId: doc.id,
    sourceVersion,
    customerLabel: doc.cliente_label,
    lines: d.rows.map((r) => ({
      descrizione: r.descrizione,
      quantita: moneyStringFromNumber(Number(r.quantita)),
      prezzo: "0.00",
      sconto: "0.00",
    })),
    totale: "0.00",
    ddt: { anno: doc.anno, serie: doc.serie, numero: doc.numero },
  };
}

export function mapDdtToUnoerpPayload(_d: DdtDetail): Record<string, unknown> {
  return {};
}

export function ddtPayloadHash(d: DdtDetail, sourceVersion: number): string {
  return hashCabOwnedSnapshot(mapDdtToCabOwnedSnapshot(d, sourceVersion));
}
