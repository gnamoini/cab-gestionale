import assert from "node:assert/strict";
import { deriveMainInert } from "@/lib/ui/mobile-nav-drawer-machine";

assert.equal(deriveMainInert("CLOSED"), false);
assert.equal(deriveMainInert("DRAGGING"), false);
assert.equal(deriveMainInert("SETTLING_CLOSE"), false);
assert.equal(deriveMainInert("LOCKED"), false);

assert.equal(deriveMainInert("OPEN"), true);
assert.equal(deriveMainInert("OPENING"), true);
assert.equal(deriveMainInert("SETTLING_OPEN"), true);

console.log("mobile-nav-drawer-machine.test.ts ok");
