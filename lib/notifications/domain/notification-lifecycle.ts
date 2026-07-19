export const NOTIFICATION_LIFECYCLE_STATUSES = [
  "CREATED",
  "VISIBLE",
  "DELIVERING",
  "DELIVERED",
  "READ",
  "ARCHIVED",
  "EXPIRED",
] as const;

export type NotificationLifecycleStatus = (typeof NOTIFICATION_LIFECYCLE_STATUSES)[number];
