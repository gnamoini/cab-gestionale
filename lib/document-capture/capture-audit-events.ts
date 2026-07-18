/** Shared audit event vocabulary for document capture flows (UX contract). */
export const CAPTURE_AUDIT_EVENTS = {
  AI_STARTED: "AI_STARTED",
  IMPORT_CONFIRMED: "IMPORT_CONFIRMED",
  IMPORT_APPLIED: "IMPORT_APPLIED",
  IMPORT_FAILED: "IMPORT_FAILED",
} as const;

export type CaptureAuditEvent = (typeof CAPTURE_AUDIT_EVENTS)[keyof typeof CAPTURE_AUDIT_EVENTS];

export type CaptureAuditEntityType = "work_order" | "inventory_movement";

export function captureAuditEntityForDomain(domain: "lavorazioni" | "ddt"): CaptureAuditEntityType {
  return domain === "lavorazioni" ? "work_order" : "inventory_movement";
}

export function buildCaptureAuditPayload(input: {
  event: CaptureAuditEvent;
  domain: "lavorazioni" | "ddt";
  entityId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    event: input.event,
    entity_type: captureAuditEntityForDomain(input.domain),
    entity_id: input.entityId,
    user_id: input.userId,
    metadata: input.metadata ?? {},
  };
}
