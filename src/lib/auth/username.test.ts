import assert from "node:assert/strict";
import {
  classifyLoginIdentifier,
  formatLoginIdentifierInput,
  isValidEmailFormat,
  isValidLoginIdentifier,
  isValidUsernameFormat,
  loginIdentifierFieldError,
  normalizeUsername,
  sanitizeUsernameInput,
  usernameFieldError,
} from "@/src/lib/auth/username";

assert.equal(normalizeUsername("  Giorgio  "), "giorgio");
assert.equal(sanitizeUsernameInput("  Mario.Rossi!  "), "mario.rossi");
assert.ok(isValidUsernameFormat("giorgio"));
assert.ok(isValidUsernameFormat("m.rossi_01"));
assert.ok(!isValidUsernameFormat("ab"));
assert.ok(!isValidUsernameFormat("_bad"));
assert.ok(isValidLoginIdentifier("a@b.it"));
assert.ok(isValidLoginIdentifier("giorgio"));
assert.ok(!isValidLoginIdentifier("bad@"));
assert.ok(isValidEmailFormat("test@example.com"));

assert.equal(classifyLoginIdentifier("user@mail.it"), "email");
assert.equal(classifyLoginIdentifier("mario"), "username");
assert.equal(classifyLoginIdentifier(""), "empty");
assert.equal(classifyLoginIdentifier("x@"), "invalid");

assert.equal(loginIdentifierFieldError(""), "Inserisci email o nome utente.");
assert.equal(loginIdentifierFieldError("mario"), null);
assert.equal(loginIdentifierFieldError("bad@"), "Indirizzo email non valido.");
assert.ok(loginIdentifierFieldError("ab")?.includes("non valido"));

assert.equal(usernameFieldError(""), "Il nome utente è obbligatorio.");
assert.equal(usernameFieldError("valid_user"), null);

assert.equal(formatLoginIdentifierInput("  USER@Mail.IT  "), "user@mail.it");
assert.equal(formatLoginIdentifierInput("  Mario!  "), "mario");

console.log("username.test.ts OK");
