import assert from "node:assert/strict";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(isPreventivoVisibleToClient("bozza"), false);
assert.equal(isPreventivoVisibleToClient("annullato"), false);
assert.equal(isPreventivoVisibleToClient("inviato"), true);
assert.equal(isPreventivoVisibleToClient("confermato"), true);

console.log("official-documents-client-visibility.test.ts OK");
