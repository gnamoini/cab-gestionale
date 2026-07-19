import type { NotificationPriority as LegacyPriority } from "@/lib/notifications/notification-types";

/** Enterprise priority labels (map from DB low|medium|high|urgent). */
export type EnterpriseNotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export function toEnterprisePriority(p: LegacyPriority): EnterpriseNotificationPriority {
  switch (p) {
    case "urgent":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "NORMAL";
    default:
      return "LOW";
  }
}

export function toLegacyPriority(p: EnterpriseNotificationPriority): LegacyPriority {
  switch (p) {
    case "CRITICAL":
      return "urgent";
    case "HIGH":
      return "high";
    case "NORMAL":
      return "medium";
    default:
      return "low";
  }
}

export function priorityToQueueRank(p: EnterpriseNotificationPriority): number {
  switch (p) {
    case "CRITICAL":
      return 100;
    case "HIGH":
      return 75;
    case "NORMAL":
      return 50;
    default:
      return 25;
  }
}
