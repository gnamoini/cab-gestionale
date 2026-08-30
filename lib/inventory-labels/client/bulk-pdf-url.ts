import type { BulkLabelCompactItem } from "@/lib/inventory-labels/domain/bulk-items";

/** URL GET sync per bulk PDF — stesso pattern di etichetta QR singola (anchor → API inline). */
export function buildInventoryBulkPdfUrl(
  items: readonly BulkLabelCompactItem[],
  preset: string,
  clienteLabel: boolean,
): string {
  const params = new URLSearchParams({
    format: "pdf",
    preset,
    clienteLabel: clienteLabel ? "true" : "false",
  });
  for (const item of items) {
    params.append("id", item.id);
    params.append("qty", String(item.quantity));
  }
  return `/api/inventory-labels/bulk?${params.toString()}`;
}

export function inventoryBulkJobPdfUrl(jobId: string): string {
  return `/api/inventory-labels/bulk/jobs/${encodeURIComponent(jobId)}`;
}
