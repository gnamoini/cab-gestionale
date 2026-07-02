import assert from "node:assert/strict";
import { didTransitionToCompletata } from "@/lib/lavorazioni/lavorazione-completed-notification-mapper";
import { didTransitionToApprovato } from "@/lib/preventivi/preventivo-approvato-notification-mapper";

assert.equal(didTransitionToCompletata("in_lavorazione", "completata"), true);
assert.equal(didTransitionToCompletata(undefined, "completata"), false);
assert.equal(didTransitionToCompletata("completata", "completata"), false);

assert.equal(didTransitionToApprovato("inviato", "approvato"), true);
assert.equal(didTransitionToApprovato("convertito", "approvato"), false);
assert.equal(didTransitionToApprovato(undefined, "approvato"), false);

console.log("notification-transition-mappers.test.ts OK");
