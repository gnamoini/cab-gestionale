import "server-only";

import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { INVENTORY_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ImportFileStatus } from "@/lib/import-files/import-file-types";
import type { InventoryDocumentStatus } from "@/src/types/supabase-tables";
import {
  inventoryReceivingFlowStepFromDocument,
  inventoryReceivingStatusToUiStatus,
} from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";

export type { InventoryReceivingPendingItem };

export async function listInventoryReceivingPending(userId: string): Promise<InventoryReceivingPendingItem[]> {
  const companyId = await getCompanyIdForUserOrNull();
  if (!companyId) return [];

  const sb = await createSupabaseServerUserClient();
  const items: InventoryReceivingPendingItem[] = [];

  const { data: importRows } = await sb
    .from("import_files")
    .select("id, status, file_name, created_at")
    .eq("kind", "ddt_receiving")
    .eq("uploaded_by", userId)
    .in("status", ["uploaded", "processing"] satisfies ImportFileStatus[])
    .order("created_at", { ascending: false })
    .limit(10);

  for (const row of importRows ?? []) {
    const { data: linkedDoc } = await sb
      .from("inventory_documents")
      .select("id")
      .eq("import_file_id", row.id)
      .neq("status", "FAILED")
      .maybeSingle();
    if (linkedDoc?.id) continue;

    items.push({
      kind: "import_file",
      id: row.id,
      importFileId: row.id,
      label: row.file_name ?? "DDT in sospeso",
      uiStatus: inventoryReceivingStatusToUiStatus(null, row.status as ImportFileStatus),
      resumeStep: "analyze",
      createdAt: row.created_at,
    });
  }

  const { data: docRows } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("company_id", companyId)
    .in("status", ["ANALYZING", "REVIEW_REQUIRED", "READY_TO_APPLY"] satisfies InventoryDocumentStatus[])
    .order("created_at", { ascending: false })
    .limit(10);

  for (const doc of docRows ?? []) {
    items.push({
      kind: "document",
      id: doc.id,
      documentId: doc.id,
      importFileId: doc.import_file_id ?? undefined,
      label: doc.document_number
        ? `DDT ${doc.document_number}`
        : doc.supplier_label
          ? `DDT — ${doc.supplier_label}`
          : "Analisi DDT in sospeso",
      uiStatus: inventoryReceivingStatusToUiStatus(doc.status),
      resumeStep: inventoryReceivingFlowStepFromDocument(doc.status) === "review" ? "review" : "analyze",
      createdAt: doc.created_at,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
}
