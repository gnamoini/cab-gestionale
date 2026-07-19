export type DeliveryProviderMode = "webpush" | "noop" | "capture";

export function resolveDeliveryProviderMode(): DeliveryProviderMode {
  const env = process.env.DELIVERY_PROVIDER?.trim().toLowerCase();
  if (env === "noop" || env === "capture" || env === "webpush") return env;
  if (process.env.NODE_ENV === "test") return "noop";
  return "webpush";
}

export function isNotificationAggregationEnabled(): boolean {
  const env = process.env.NOTIFICATION_AGGREGATION?.trim().toLowerCase();
  if (env === "false" || env === "0") return false;
  return true;
}
