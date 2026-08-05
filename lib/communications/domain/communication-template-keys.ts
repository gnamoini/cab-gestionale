/** Template keys — may differ from domain event type (es. estimate.published). */
export const COMMUNICATION_TEMPLATE_KEYS = [
  "work_order.created",
  "work_order.completed",
  "estimate.published",
  "estimate.approved",
  "estimate.reminder",
  "estimate.accepted",
  "estimate.rejected",
  "invoice.issued",
  "supplier_order.sent",
  "maintenance.reminder",
] as const;

export type CommunicationTemplateKey = (typeof COMMUNICATION_TEMPLATE_KEYS)[number];
