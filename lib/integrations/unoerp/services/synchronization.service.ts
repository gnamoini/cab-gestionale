import type { CabDocumentType, UnoerpJobOperation } from "@/lib/integrations/unoerp/types";
import { mapConsuntivoToUnoerpPayload } from "@/lib/integrations/unoerp/mappers/consuntivo.mapper";
import { mapDdtToUnoerpPayload } from "@/lib/integrations/unoerp/mappers/ddt.mapper";
import { mapPreventivoToUnoerpPayload } from "@/lib/integrations/unoerp/mappers/preventivo.mapper";
import { runPreflight, writerMayProceed } from "@/lib/integrations/unoerp/preflight/preflight-gate";
import { assertOwnedByCab } from "@/lib/integrations/unoerp/ownership/document-ownership";
import { isStaleJob } from "@/lib/integrations/unoerp/verification/stale-job";
import { getDocumentTypeRegistryEntry } from "@/lib/integrations/unoerp/document-type-registry.server";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DdtDetail } from "@/lib/ddt/types";

export type SyncJobInput = {
  operation: UnoerpJobOperation;
  documentType: CabDocumentType;
  cabDocumentId: string;
  sourceVersion: number;
  lastSyncedSourceVersion: number | null;
  link: {
    cabDocumentId: string;
    cabDocumentType: CabDocumentType;
    unoerpModule: string;
    unoerpFile: string;
    unoerpRecordId: string;
  } | null;
  preventivo?: PreventivoRecord;
  ddt?: DdtDetail;
  customerResolved: boolean;
  itemsResolved: boolean;
  vatResolved: boolean;
  correlationFieldKnown: boolean;
};

export type SyncOutcome =
  | { status: "STALE_JOB" }
  | { status: "BLOCKED"; reasons: string[] }
  | { status: "NO_WRITE"; reason: "registry_unresolved" }
  | { status: "WOULD_CREATE" | "WOULD_UPDATE"; payload: Record<string, unknown> };

export function planSync(input: SyncJobInput): SyncOutcome {
  if (isStaleJob(input.sourceVersion, input.lastSyncedSourceVersion)) {
    return { status: "STALE_JOB" };
  }
  if (input.operation === "UPDATE") {
    const reg = getDocumentTypeRegistryEntry(input.documentType);
    if (!input.link || !reg.unoerpModule || !reg.unoerpFile) {
      return { status: "BLOCKED", reasons: ["UNOERP_OWNERSHIP_VIOLATION"] };
    }
    const owned = assertOwnedByCab({
      link: input.link,
      requested: {
        cabDocumentId: input.cabDocumentId,
        cabDocumentType: input.documentType,
        unoerpModule: reg.unoerpModule,
        unoerpFile: reg.unoerpFile,
        unoerpRecordId: input.link.unoerpRecordId,
      },
    });
    if (!owned.ok) return { status: "BLOCKED", reasons: [owned.code] };
  }

  let payload: Record<string, unknown> = {};
  if (input.documentType === "preventivo" && input.preventivo) {
    payload = mapPreventivoToUnoerpPayload(input.preventivo);
  } else if (input.documentType === "consuntivo" && input.preventivo) {
    payload = mapConsuntivoToUnoerpPayload(input.preventivo);
  } else if (input.documentType === "ddt" && input.ddt) {
    payload = mapDdtToUnoerpPayload(input.ddt);
  }

  const pre = runPreflight({
    documentType: input.documentType,
    operation: input.operation,
    payload,
    customerResolved: input.customerResolved,
    itemsResolved: input.itemsResolved,
    vatResolved: input.vatResolved,
    correlationFieldKnown: input.correlationFieldKnown,
  });
  if (!writerMayProceed(pre)) {
    return { status: "BLOCKED", reasons: pre.reasons };
  }
  return { status: input.operation === "CREATE" ? "WOULD_CREATE" : "WOULD_UPDATE", payload };
}
