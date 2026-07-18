import type { InventoryReceivingUiStatus } from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";

export type InventoryReceivingPendingItem = {
  kind: "import_file" | "document";
  id: string;
  importFileId?: string;
  documentId?: string;
  label: string;
  uiStatus: InventoryReceivingUiStatus;
  resumeStep: "analyze" | "review";
  createdAt: string;
};
