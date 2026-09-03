import type { DdtDetail } from "@/lib/ddt/types";
import { planSync } from "@/lib/integrations/unoerp/services/synchronization.service";

export function planDdtSync(d: DdtDetail, sourceVersion: number, operation: "CREATE" | "UPDATE") {
  return planSync({
    operation,
    documentType: "ddt",
    cabDocumentId: d.document.id,
    sourceVersion,
    lastSyncedSourceVersion: null,
    link: null,
    ddt: d,
    customerResolved: false,
    itemsResolved: false,
    vatResolved: false,
    correlationFieldKnown: false,
  });
}
