import assert from "node:assert/strict";
import { mezzoBulkIdsFromSearchParams, normalizeMezzoBulkIds } from "@/lib/mezzo-labels/validation";

const a = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const b = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

assert.deepEqual(normalizeMezzoBulkIds([a, b, a]), [a, b]);

const repeated = new URLSearchParams({ format: "pdf" });
repeated.append("id", a);
repeated.append("id", b);
assert.deepEqual(mezzoBulkIdsFromSearchParams(repeated), [a, b]);

const csv = new URLSearchParams({ format: "pdf", ids: `${a},${b}` });
assert.deepEqual(mezzoBulkIdsFromSearchParams(csv), [a, b]);

console.log("mezzo-labels/validation.test.ts OK");
