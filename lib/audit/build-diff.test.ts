import assert from "node:assert/strict";
import { auditDiff, auditSnapshot } from "@/lib/audit/build-diff";

const before = { stato: "operativo", km: 10000 };
const after = { stato: "fermo", km: 12000 };
const diff = auditDiff(before, after) as { before: typeof before; after: typeof after };

assert.deepEqual(diff.before, before);
assert.deepEqual(diff.after, after);

console.log("build-diff.test.ts OK");
