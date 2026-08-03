/**
 * Audit: subscribe realtime senza filter — ARCHIVE/RESTORE = UPDATE su lavorazioni.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { cabSyncEventFromPostgresChange } from "@/lib/sync/cab-sync-bus";

const ROOT = resolve(import.meta.dirname ?? __dirname, "..", "..");
const channelSrc = readFileSync(resolve(ROOT, "lib/realtime/postgres-changes-channel.ts"), "utf8");
const invalidateTargetsSrc = readFileSync(resolve(ROOT, "src/lib/react-query/invalidate-targets.ts"), "utf8");

assert.match(channelSrc, /event: spec\.event \?\? "\*"/, "default event * for all postgres_changes");
assert.ok(!channelSrc.includes("filter:"), "no column filter on postgres_changes subscribe");

for (const table of CLIENT_PORTAL_SYNC_TABLES) {
  assert.match(invalidateTargetsSrc, new RegExp(`${table}:`), `invalidate-targets maps portal table ${table}`);
}

const archiveUpdate = cabSyncEventFromPostgresChange("lavorazioni", {
  eventType: "UPDATE",
  new: { id: "lav-1", archived: true, updated_at: "2026-08-01T00:00:00.000Z" },
  old: { id: "lav-1", archived: false },
});
assert.equal(archiveUpdate?.type, "entity_updated");

const insert = cabSyncEventFromPostgresChange("lavorazioni", {
  eventType: "INSERT",
  new: { id: "lav-new", created_at: "2026-08-01T00:00:00.000Z" },
});
assert.equal(insert?.type, "entity_created");

console.log("client-portal-realtime-subscribe-audit.test.ts OK");
