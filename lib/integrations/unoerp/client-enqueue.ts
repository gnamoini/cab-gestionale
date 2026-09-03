export type UnoerpEnqueueBody = {
  cabDocumentType: "preventivo" | "consuntivo" | "ddt";
  cabDocumentId: string;
  sourceVersion: number;
  payloadHash: string;
  operation: "CREATE" | "UPDATE";
  payloadSnapshot?: Record<string, unknown>;
};

export async function requestUnoerpEnqueue(body: UnoerpEnqueueBody): Promise<void> {
  try {
    await fetch("/api/integrations/unoerp/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    /* fail-safe: CAB save already succeeded */
  }
}

export async function requestUnoerpMarkLocal(body: {
  cabDocumentType: "preventivo" | "consuntivo" | "ddt";
  cabDocumentId: string;
  status: "CAB_DDT_CANCELLED_AFTER_SYNC" | "CAB_DOCUMENT_REMOVED";
}): Promise<void> {
  try {
    await fetch("/api/integrations/unoerp/mark-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    /* fail-safe */
  }
}
