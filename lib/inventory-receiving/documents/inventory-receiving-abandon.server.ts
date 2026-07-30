import "server-only";

import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { INVENTORY_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import {
  cancelImportFile,
  completeImportFileProcessing,
} from "@/lib/import-files/import-file-lifecycle.server";
import { assertImportFileOwner } from "@/lib/import-files/import-file-access.server";
import { canTransitionInventoryDocument } from "@/lib/inventory-receiving/documents/inventory-receiving-status";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { InventoryDocumentStatus } from "@/src/types/supabase-tables";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

const ABANDONABLE_DOCUMENT_STATUSES = [
  "UPLOADED",
  "ANALYZING",
  "REVIEW_REQUIRED",
  "READY_TO_APPLY",
  "PARTIALLY_APPLIED",
] as const satisfies readonly InventoryDocumentStatus[];

function abandonError(message: string, code: string): Error {
  const err = new Error(message);
  (err as Error & { code?: string }).code = code;
  return err;
}

async function failPendingDocumentsForImportFile(importFileId: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  await sb
    .from("inventory_documents")
    .update({ status: "FAILED" satisfies InventoryDocumentStatus })
    .eq("import_file_id", importFileId)
    .in("status", [...ABANDONABLE_DOCUMENT_STATUSES]);
}

export async function abandonInventoryReceivingDocument(documentId: string, userId: string): Promise<void> {
  const canWrite = await verifyServerPageWrite("magazzino_carichi");
  if (!canWrite) throw abandonError("Permesso negato", "FORBIDDEN");

  const companyId = await getCompanyIdForUserOrNull();
  if (!companyId) throw abandonError("Tenant non configurato", "TENANT_MISSING");

  const sb = await createSupabaseServerUserClient();
  const { data: doc, error } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("id", documentId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw abandonError(error.message, "ABANDON_FAILED");
  if (!doc) throw abandonError("Documento non trovato", "NOT_FOUND");

  if (!canTransitionInventoryDocument(doc.status, "FAILED")) {
    throw abandonError("Il documento non può essere annullato in questo stato.", "invalid_status_transition");
  }

  const { error: updErr } = await sb
    .from("inventory_documents")
    .update({ status: "FAILED" satisfies InventoryDocumentStatus })
    .eq("id", documentId);

  if (updErr) throw abandonError(updErr.message, "ABANDON_FAILED");
}

export async function abandonInventoryReceivingImportFile(importFileId: string, userId: string): Promise<void> {
  const row = await assertImportFileOwner(importFileId, userId);

  if (row.kind !== "ddt_receiving") {
    await cancelImportFile(importFileId, userId);
    return;
  }

  if (row.status === "uploaded") {
    await cancelImportFile(importFileId, userId);
    return;
  }

  if (row.status === "processing") {
    await completeImportFileProcessing(importFileId, userId, {
      outcome: "failed",
      failedReasonCode: "USER_CANCELLED",
      lastError: { message: "Annullato dall'utente" },
    });
    await failPendingDocumentsForImportFile(importFileId);
    return;
  }

  if (row.status === "processed" || row.status === "failed") {
    const sb = await createSupabaseServerUserClient();
    const { data: doc } = await sb
      .from("inventory_documents")
      .select("id, status")
      .eq("import_file_id", importFileId)
      .in("status", [...ABANDONABLE_DOCUMENT_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (doc?.id) {
      await abandonInventoryReceivingDocument(doc.id, userId);
      return;
    }
    return;
  }

  throw abandonError("Transizione import file non valida", "invalid_status_transition");
}
