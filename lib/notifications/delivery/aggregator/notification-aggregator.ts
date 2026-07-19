import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import type { AggregationConfig } from "@/lib/notifications/application/policies/notification-policy-config";
import { buildAggregatedResolvedNotification } from "@/lib/notifications/delivery/resolver/resolved-notification-builder";

export type RawJobBatch = {
  notificationIds: string[];
  records: NotificationRecord[];
  aggregationKey: string | null;
  bundled: boolean;
};

export function buildAggregationKey(record: NotificationRecord): string {
  return `${record.type}:${record.scopeType}:${record.scopeValue ?? "global"}`;
}

export function aggregateRawBatch(
  records: NotificationRecord[],
  config: AggregationConfig,
): RawJobBatch[] {
  if (!records.length) return [];
  if (config.mode === "none" || records.length === 1) {
    return records.map((r) => ({
      notificationIds: [r.id],
      records: [r],
      aggregationKey: null,
      bundled: false,
    }));
  }

  const groups = new Map<string, NotificationRecord[]>();
  for (const r of records) {
    const key = buildAggregationKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const out: RawJobBatch[] = [];
  for (const [key, group] of groups) {
    const max = config.maxBundle ?? 50;
    const slice = group.slice(0, max);
    if (config.mode === "bundle_push" && slice.length > 1) {
      out.push({
        notificationIds: slice.map((r) => r.id),
        records: slice,
        aggregationKey: key,
        bundled: true,
      });
    } else if (config.mode === "bundle_all" && slice.length > 1) {
      out.push({
        notificationIds: [slice[0].id],
        records: slice,
        aggregationKey: key,
        bundled: true,
      });
    } else {
      for (const r of slice) {
        out.push({
          notificationIds: [r.id],
          records: [r],
          aggregationKey: null,
          bundled: false,
        });
      }
    }
  }
  return out;
}

export function summaryForBundle(records: NotificationRecord[]): { title: string; body: string } {
  const type = records[0]?.type ?? "notification";
  const count = records.length;
  if (type === "magazzino_sotto_scorta") {
    return {
      title: `${count} ricambi sotto scorta`,
      body: `Ci sono ${count} avvisi magazzino da controllare`,
    };
  }
  return {
    title: `${count} notifiche`,
    body: `Hai ${count} nuove notifiche`,
  };
}

export function resolveBundledNotification(records: NotificationRecord[]) {
  const { title, body } = summaryForBundle(records);
  return buildAggregatedResolvedNotification(records, title, body);
}
