import assert from "node:assert/strict";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(isPreventivoVisibleToClient("bozza", null, null), false);
assert.equal(isPreventivoVisibleToClient("annullato", null, null), false);
assert.equal(isPreventivoVisibleToClient("inviato", null, "2026-01-01T00:00:00.000Z"), true);
assert.equal(isPreventivoVisibleToClient("acquisito", "accettato", "2026-01-01T00:00:00.000Z"), true);
assert.equal(isPreventivoVisibleToClient("bozza", "pending", "2026-01-01T00:00:00.000Z"), true);

console.log("official-documents-client-visibility.test.ts OK");
