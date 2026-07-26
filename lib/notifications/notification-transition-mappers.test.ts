import assert from "node:assert/strict";
import { didTransitionToCompletata } from "@/lib/lavorazioni/lavorazione-completed-notification-mapper";
import { didTransitionToApprovato, didTransitionToConfermato } from "@/lib/preventivi/preventivo-approvato-notification-mapper";

assert.equal(didTransitionToCompletata("in_lavorazione", "completata"), true);
assert.equal(didTransitionToCompletata(undefined, "completata"), false);
assert.equal(didTransitionToCompletata("completata", "completata"), false);

assert.equal(didTransitionToConfermato("inviato", "confermato"), true);
assert.equal(didTransitionToConfermato("confermato", "confermato"), false);
assert.equal(didTransitionToConfermato(undefined, "confermato"), false);
assert.equal(didTransitionToApprovato("inviato", "confermato"), true);

console.log("notification-transition-mappers.test.ts OK");
