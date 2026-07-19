export type DeliveryChannel =
  | "sidebar"
  | "realtime"
  | "badge"
  | "push"
  | "desktop"
  | "email"
  | "sms"
  | "webhook";

export type PresenceStatus = "ONLINE" | "AWAY" | "BACKGROUND" | "OFFLINE";

export type AggregationMode = "none" | "bundle_push" | "bundle_all";

export type AggregationConfig = {
  mode: AggregationMode;
  windowSeconds?: number;
  maxBundle?: number;
};

export type PresenceChannelPolicy = Partial<Record<PresenceStatus, DeliveryChannel[]>>;

export type NotificationPolicyConfig = {
  channels: DeliveryChannel[];
  aggregation: AggregationConfig;
  ttlDays: number | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  actions: { id: string; labelKey: string; href?: string; style?: "primary" | "danger" | "default" }[];
  presencePolicy: PresenceChannelPolicy;
};
