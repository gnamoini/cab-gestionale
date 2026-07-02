import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPublishedSnapshot,
  createTkbSeedDraft,
  hashDraftBundle,
  hashPublishedSnapshot,
  publishTkbDraft,
  resetMemorySnapshots,
} from "@/lib/domain/technical-knowledge-base";
import { parseTkbPublishedSnapshot } from "@/lib/domain/technical-knowledge-base/contracts/tkb-types.contract";

test("TKB snapshot round-trip: build → hash → parse", () => {
  resetMemorySnapshots();
  const draft = createTkbSeedDraft();
  const draftHash = hashDraftBundle(draft);
  const snap = buildPublishedSnapshot(draft, 1, new Date().toISOString());
  const snapHash = hashPublishedSnapshot(snap);
  const parsed = parseTkbPublishedSnapshot(snap);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.kbVersion, 1);
  assert.ok(parsed.interventi.length >= 1);
  assert.ok(draftHash.length === 64);
  assert.ok(snapHash.length === 64);
});

test("TKB publish idempotente", () => {
  resetMemorySnapshots();
  const draft = createTkbSeedDraft();
  const r1 = publishTkbDraft(draft);
  const r2 = publishTkbDraft(draft);
  assert.equal(r1.created, true);
  assert.equal(r2.idempotent, true);
  assert.equal(r1.kbVersion, r2.kbVersion);
});

console.log("tkb-snapshot.contract.test.ts OK");
