import assert from "node:assert/strict";
import { resolveProfileAccountNames } from "@/src/lib/auth/resolve-user-display-name";

const split = resolveProfileAccountNames({
  givenName: "d.cascione",
  cognome: null,
  email: "d.cascione@amiupuglia.it",
  displayName: "Amiu Bari",
});
assert.equal(split.nome, "D");
assert.equal(split.cognome, "Cascione");

const full = resolveProfileAccountNames({
  givenName: "Mario",
  cognome: "Rossi",
  email: "mario@example.com",
  displayName: "Mario Rossi",
});
assert.equal(full.nome, "Mario");
assert.equal(full.cognome, "Rossi");

console.log("resolve-profile-account-names.test.ts OK");
