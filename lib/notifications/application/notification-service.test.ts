import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NOTIFICATION_POLICIES } from "@/lib/notifications/application/policies/notification-policies";
import { aggregateRawBatch } from "@/lib/notifications/delivery/aggregator/notification-aggregator";
import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import { ChannelPolicyResolver } from "@/lib/notifications/delivery/resolver/channel-policy-resolver";
import { PresenceResolver } from "@/lib/notifications/delivery/resolver/presence-resolver";

const ROOT = process.cwd();

function mockRecord(partial: Partial<NotificationRecord> & Pick<NotificationRecord, "id" | "type">): NotificationRecord {
  return {
    createdAt: new Date().toISOString(),
    scopeType: "global",
    scopeValue: null,
    scopeModule: "magazzino",
    priority: "high",
    status: "CREATED",
    statusChangedAt: new Date().toISOString(),
    title: "t",
    body: "b",
    href: "/magazzino",
    entityType: null,
    entityId: null,
    dedupKey: `mag:${partial.id}:crossing`,
    idempotencyKey: null,
    translationKey: "notification.magazzino_sotto_scorta",
    translationParams: {},
    snapshot: {},
    actions: [],
    payloadVersion: "v1",
    expiresAt: null,
    sourceDomainEvent: null,
    actorId: null,
    createdBy: null,
    ...partial,
  };
}

assert.ok(NOTIFICATION_POLICIES.lavorazione_created);
assert.equal(NOTIFICATION_POLICIES.magazzino_sotto_scorta?.aggregation.mode, "bundle_push");
assert.ok(NOTIFICATION_POLICIES.admin_dashboard_test?.presencePolicy.ONLINE?.includes("push"));

const magRecords = [1, 2, 3].map((i) =>
  mockRecord({ id: `id-${i}`, type: "magazzino_sotto_scorta" }),
);
const batches = aggregateRawBatch(magRecords, { mode: "bundle_push", windowSeconds: 60, maxBundle: 50 });
assert.equal(batches.length, 1);
assert.equal(batches[0]?.bundled, true);
assert.equal(batches[0]?.notificationIds.length, 3);

const ctx = PresenceResolver.buildUserDeliveryContext(
  { id: "u1", company_id: "c1", role_key: "admin" },
  [{ id: "d1", endpoint: "https://example.com", user_agent: null, presence_status: "ONLINE" }],
  PresenceResolver.defaultPreferences(),
);
const resolved = ChannelPolicyResolver.resolveChannels("lavorazione_created", ctx, "HIGH");
assert.ok(resolved.channels.includes("realtime"));
assert.ok(!resolved.channels.includes("push"));

const serviceSrc = fs.readFileSync(
  path.join(ROOT, "lib/notifications/application/notification-service.ts"),
  "utf8",
);
assert.doesNotMatch(serviceSrc, /delivery\/aggregator/);
assert.doesNotMatch(serviceSrc, /DeliveryPlanner/);
assert.doesNotMatch(serviceSrc, /Dispatcher/);

const migrationSrc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261019120000_notification_ssot_v4.sql"),
  "utf8",
);
assert.match(migrationSrc, /delivery_queue/);
assert.match(migrationSrc, /cab_enqueue_raw_delivery/);
assert.doesNotMatch(migrationSrc, /cab_enqueue_push_delivery/);

console.log("notification-service.test — PASS");
