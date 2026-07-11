import assert from "node:assert/strict";
import { createRandomUuid } from "@/lib/uuid/create-random-uuid";

const id = createRandomUuid();
assert.ok(id.length >= 8);
assert.match(id, /^[0-9a-f-]{36}$|uuid-/i);

console.log("create-random-uuid.test.ts OK");
