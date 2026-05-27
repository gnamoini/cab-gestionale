import assert from "node:assert/strict";
import { canModerateSupportNotes } from "@/lib/supporto/support-note-permissions";

assert.equal(canModerateSupportNotes({ ruolo: "admin" }), true);
assert.equal(canModerateSupportNotes({ ruolo: "manager" }), false);
assert.equal(canModerateSupportNotes({ ruolo: "operatore" }), false);
assert.equal(canModerateSupportNotes({ ruolo: "guest" }), false);

console.log("support-note-permissions.test.ts OK");
