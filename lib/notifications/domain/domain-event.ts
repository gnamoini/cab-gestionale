/** Domain events — distinct from inbox notification types. */
export const DOMAIN_EVENT_TYPES = [
  "work_order.created",
  "work_order.completed",
  "inventory.below_minimum",
  "invoice.overdue_digest",
  "employees.presence_reminder",
  "maintenance.due",
  "client_portal.work_order_ingress",
  "client_portal.work_order_completed",
  "preventivo.status_changed",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];
