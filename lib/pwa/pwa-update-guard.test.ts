import assert from "node:assert/strict";
import {
  getPwaUpdateBlockReason,
  registerPwaUpdateGuard,
  resetPwaUpdateGuardsForTests,
} from "@/lib/pwa/pwa-update-guard";

resetPwaUpdateGuardsForTests();
assert.equal(getPwaUpdateBlockReason(), null);

let dirty = true;
const unregister = registerPwaUpdateGuard({
  id: "test-form",
  isDirty: () => dirty,
  message: "Salva il form prima di aggiornare.",
});

assert.equal(getPwaUpdateBlockReason(), "Salva il form prima di aggiornare.");
dirty = false;
assert.equal(getPwaUpdateBlockReason(), null);

dirty = true;
unregister();
assert.equal(getPwaUpdateBlockReason(), null);

resetPwaUpdateGuardsForTests();
console.log("pwa-update-guard.test.ts OK");
