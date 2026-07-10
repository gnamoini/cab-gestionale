import assert from "node:assert/strict";
import {
  createImportCorrelationId,
  formatImportCorrelationDisplay,
  isImportCorrelationId,
  resolveImportCorrelationId,
} from "@/lib/import-core/correlation-id";

const id = createImportCorrelationId();
assert.ok(isImportCorrelationId(id), "must be UUIDv7 shape");
assert.match(formatImportCorrelationDisplay(id), /^IMP-\d{8}-[0-9A-F]{5}$/);

const resolved = resolveImportCorrelationId(id);
assert.equal(resolved, id);

const fresh = resolveImportCorrelationId(null);
assert.ok(isImportCorrelationId(fresh));

console.log("correlation-id.test.ts OK");
