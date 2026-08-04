import type { CommunicationChannel, CommunicationTargetType } from "@/lib/communications/domain/communication-types";
import type { CommunicationTemplateKey } from "@/lib/communications/domain/communication-template-keys";

export type CommunicationPolicyConditions = {
  email_exists?: boolean;
  payload?: Record<string, string>;
};

export type CommunicationPolicyDefinition = {
  domainEvent: string;
  enabled: boolean;
  allowedChannels: CommunicationChannel[];
  recipientType: CommunicationTargetType;
  templateKey: CommunicationTemplateKey;
  attachmentTypes: string[];
  conditions: CommunicationPolicyConditions;
  /** Maps to cliente_communication_preferences column when customer. */
  preferenceKey?: "receive_work_order_updates" | "receive_quotes" | "receive_maintenance_reminders";
};

export const COMMUNICATION_POLICY_CATALOG: CommunicationPolicyDefinition[] = [
  {
    domainEvent: "work_order.created",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "work_order.created",
    attachmentTypes: [],
    conditions: { email_exists: true },
    preferenceKey: "receive_work_order_updates",
  },
  {
    domainEvent: "work_order.completed",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "work_order.completed",
    attachmentTypes: [],
    conditions: { email_exists: true },
    preferenceKey: "receive_work_order_updates",
  },
  {
    domainEvent: "preventivo.status_changed",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "estimate.published",
    attachmentTypes: ["preventivo"],
    conditions: { email_exists: true, payload: { to: "inviato" } },
    preferenceKey: "receive_quotes",
  },
  {
    domainEvent: "preventivo.status_changed",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "estimate.approved",
    attachmentTypes: [],
    conditions: { email_exists: true, payload: { to: "confermato" } },
    preferenceKey: "receive_quotes",
  },
  {
    domainEvent: "invoice.issued",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "invoice.issued",
    attachmentTypes: ["fattura"],
    conditions: { email_exists: true },
  },
  {
    domainEvent: "supplier_order.send_requested",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "supplier",
    templateKey: "supplier_order.sent",
    attachmentTypes: ["ordine-fornitore"],
    conditions: { email_exists: true },
  },
  {
    domainEvent: "maintenance.reminder",
    enabled: true,
    allowedChannels: ["email"],
    recipientType: "customer",
    templateKey: "maintenance.reminder",
    attachmentTypes: [],
    conditions: { email_exists: true },
    preferenceKey: "receive_maintenance_reminders",
  },
];

export function findPoliciesForDomainEvent(
  domainEvent: string,
  payload: Record<string, unknown>,
): CommunicationPolicyDefinition[] {
  return COMMUNICATION_POLICY_CATALOG.filter((p) => {
    if (p.domainEvent !== domainEvent || !p.enabled) return false;
    const cond = p.conditions;
    if (cond.payload) {
      for (const [k, v] of Object.entries(cond.payload)) {
        const actual = payload[k];
        if (String(actual ?? "") !== v) return false;
      }
    }
    return true;
  });
}
