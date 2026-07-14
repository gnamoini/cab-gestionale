export type PushPermissionState =
  | "unsupported"
  | "default"
  | "prompted"
  | "granted"
  | "denied"
  | "revoked";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon: string;
  tag: string;
  href: string;
  notificationId?: string;
  type?: string;
};

export type PushDeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "dead_letter";

export type PushSubscribeOutcome = "granted" | "denied" | "unsupported" | "error";
