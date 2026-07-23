import assert from "node:assert/strict";

import { nullIfBlankUuid } from "@/lib/document-capture/null-if-blank-uuid";

assert.equal(nullIfBlankUuid(null), null);
assert.equal(nullIfBlankUuid(undefined), null);
assert.equal(nullIfBlankUuid(""), null);
assert.equal(nullIfBlankUuid("   "), null);
assert.equal(nullIfBlankUuid("00000000-0000-4000-8000-000000000001"), "00000000-0000-4000-8000-000000000001");
assert.equal(nullIfBlankUuid(" 00000000-0000-4000-8000-000000000001 "), "00000000-0000-4000-8000-000000000001");

console.log("null-if-blank-uuid: ok");
