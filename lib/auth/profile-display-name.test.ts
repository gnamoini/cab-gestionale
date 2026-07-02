import assert from "node:assert/strict";
import { profileDisplayName } from "@/lib/auth/profile-display-name";

assert.equal(profileDisplayName({ nome: "Mario", cognome: "Rossi" }), "Mario Rossi");
assert.equal(profileDisplayName({ nome: "Mario", cognome: null }), "Mario");
assert.equal(profileDisplayName({ nome: "Mario", cognome: "" }), "Mario");
assert.equal(profileDisplayName({ nome: "", cognome: "Rossi" }), "Rossi");

console.log("profile-display-name.test.ts OK");
