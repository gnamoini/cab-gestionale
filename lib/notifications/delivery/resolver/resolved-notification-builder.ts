import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import type { ResolvedNotification } from "@/lib/notifications/domain/resolved-notification";
import type { NotificationAction } from "@/lib/notifications/domain/notification-action";
import { getNotificationPolicy } from "@/lib/notifications/application/policies/notification-policies";

const FALLBACK_TITLES: Record<string, string> = {
  "notification.lavorazione_created.title": "Nuova lavorazione",
  "notification.lavorazione_completata.title": "Lavorazione completata",
  "notification.magazzino_sotto_scorta.title": "Sotto scorta",
  "notification.action.open": "Apri",
};

function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key];
    return v != null ? String(v) : "";
  });
}

function resolveTitle(record: NotificationRecord): string {
  const key = record.translationKey;
  if (!key) return record.title;
  const titleKey = key.endsWith(".title") ? key : `${key}.title`;
  const template = FALLBACK_TITLES[titleKey] ?? record.title;
  return interpolate(template, { ...record.snapshot, ...record.translationParams });
}

function resolveBody(record: NotificationRecord): string {
  const key = record.translationKey;
  if (!key) return record.body;
  const bodyKey = key.endsWith(".body") ? key : `${key}.body`;
  const template = record.body;
  void bodyKey;
  return interpolate(template, { ...record.snapshot, ...record.translationParams });
}

function resolveActions(record: NotificationRecord): NotificationAction[] {
  if (record.actions.length) return record.actions;
  const policy = getNotificationPolicy(record.type);
  return policy.actions.map((a) => ({
    id: a.id,
    labelKey: a.labelKey,
    href: a.href,
    style: a.style,
  }));
}

export function buildResolvedNotification(
  record: NotificationRecord,
  locale = "it",
): ResolvedNotification {
  void locale;
  return {
    id: record.id,
    notificationType: record.type,
    payloadVersion: record.payloadVersion,
    title: resolveTitle(record),
    body: resolveBody(record),
    deepLink: record.href ?? "/dashboard",
    actions: resolveActions(record),
    snapshot: record.snapshot,
    priority: record.priority,
  };
}

export function buildAggregatedResolvedNotification(
  records: NotificationRecord[],
  summaryTitle: string,
  summaryBody: string,
): ResolvedNotification {
  const first = records[0];
  return {
    id: first.id,
    notificationType: first.type,
    payloadVersion: first.payloadVersion,
    title: summaryTitle,
    body: summaryBody,
    deepLink: first.href ?? "/dashboard",
    actions: resolveActions(first),
    snapshot: { count: String(records.length), ...first.snapshot },
    priority: first.priority,
  };
}
