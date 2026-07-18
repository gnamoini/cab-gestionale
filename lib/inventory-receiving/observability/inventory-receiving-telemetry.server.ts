import "server-only";

type InventoryReceivingTelemetryInput = {
  operation: string;
  documentId?: string;
  importFileId?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

/** ponytail: console structured log fino a integrazione observability globale. */
export function traceInventoryReceivingOperation(input: InventoryReceivingTelemetryInput): void {
  if (process.env.NODE_ENV === "test") return;
  console.info(
    JSON.stringify({
      scope: "inventory_receiving",
      ...input,
      at: new Date().toISOString(),
    }),
  );
}
