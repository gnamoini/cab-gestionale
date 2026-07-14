import assert from "node:assert/strict";
import { profileDisplayName, securityUserDisplayName } from "@/lib/auth/profile-display-name";

assert.equal(profileDisplayName({ nome: "Mario", cognome: "Rossi" }), "Mario Rossi");
assert.equal(profileDisplayName({ nome: "Mario", cognome: null }), "Mario");
assert.equal(profileDisplayName({ nome: "Mario", cognome: "" }), "Mario");
assert.equal(profileDisplayName({ nome: "", cognome: "Rossi" }), "Rossi");

assert.equal(
  securityUserDisplayName({ nome: "mario.r", cognome: "Rossi", username: "mario.r" }),
  "Rossi",
);
assert.equal(
  securityUserDisplayName({ nome: "Mario", cognome: "Rossi", username: "mario.r" }),
  "Mario Rossi",
);
assert.equal(securityUserDisplayName({ nome: "mario.r", cognome: null, username: "mario.r" }), "—");

console.log("profile-display-name.test.ts OK");
