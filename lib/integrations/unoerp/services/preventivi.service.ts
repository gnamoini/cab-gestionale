import type { PreventivoRecord } from "@/lib/preventivi/types";
import { planSync } from "@/lib/integrations/unoerp/services/synchronization.service";

export function planPreventivoSync(p: PreventivoRecord, sourceVersion: number, operation: "CREATE" | "UPDATE") {
  return planSync({
    operation,
    documentType: p.tipoDocumento === "consuntivo" ? "consuntivo" : "preventivo",
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
