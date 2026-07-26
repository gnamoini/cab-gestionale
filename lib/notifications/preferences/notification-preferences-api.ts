export type NotificationSettingsEventViewModel = {
  notificationEventId: string;
  title: string;
  description: string;
  enabled: boolean;
  preferenceSource: "default" | "personalized";
  severity: "info" | "warning" | "critical";
  canRestore: boolean;
};

export type NotificationSettingsPageViewModel = {
  key: string;
  label: string;
  enabledCount: number;
  totalCount: number;
  events: NotificationSettingsEventViewModel[];
};

export type NotificationSettingsViewModel = {
  pages: NotificationSettingsPageViewModel[];
};

export type PatchNotificationPreferenceBody = {
  enabled: boolean;
};

export type DispatchNotificationBody = {
  notificationEventId: string;
  dispatchIdempotencyKey: string;
  actorId?: string | null;
  excludeActor?: boolean;
  payload: Record<string, unknown>;
};

export type DispatchNotificationResponse = {
  created: number;
  skipped: number;
  duplicate: boolean;
};
