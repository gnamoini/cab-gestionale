import type { PreventivoRecord } from "@/lib/preventivi/types";
import { planSync } from "@/lib/integrations/unoerp/services/synchronization.service";

export function planConsuntivoSync(p: PreventivoRecord, sourceVersion: number, operation: "CREATE" | "UPDATE") {
  if (p.tipoDocumento !== "consuntivo") {
    throw new Error("planConsuntivoSync requires tipoDocumento=consuntivo");
  }
  return planSync({
    operation,
    documentType: "consuntivo",
    cabDocumentId: p.id,
    sourceVersion,
    lastSyncedSourceVersion: null,
    link: null,
    preventivo: p,
    customerResolved: false,
    itemsResolved: false,
    vatResolved: false,
    correlationFieldKnown: false,
  });
}
