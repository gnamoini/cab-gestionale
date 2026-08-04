export const COMMUNICATION_TARGET_TYPES = ["customer", "supplier", "internal", "system"] as const;
export type CommunicationTargetType = (typeof COMMUNICATION_TARGET_TYPES)[number];

export const COMMUNICATION_CHANNELS = ["email", "whatsapp", "sms", "portal"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_LOG_STATUSES = [
  "pending",
  "simulated",
  "sent",
  "delivered",
  "bounced",
  "failed",
  "skipped",
] as const;
export type CommunicationLogStatus = (typeof COMMUNICATION_LOG_STATUSES)[number];

export type CommunicationAttachmentRef = {
  type: string;
  fileName: string;
  storagePath?: string;
};

export type RenderedPayload = Record<string, string | number | null>;
