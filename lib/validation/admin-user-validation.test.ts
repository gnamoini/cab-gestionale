import { validateCreateUserInput, validateResolveLoginIdentifier } from "@/lib/validation/admin-user-validation";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(validateCreateUserInput({
  nome: "Mario",
  cognome: "Rossi",
  username: "mario.r",
  email: "mario@example.com",
  password: "password123",
  ruolo: "operatore",
}) === null, "valid create user");

assert(validateCreateUserInput({
  nome: "X",
  cognome: "Rossi",
  username: "mario.r",
  email: "mario@example.com",
  password: "password123",
  ruolo: "operatore",
}) !== null, "short nome rejected");

assert(validateCreateUserInput({
  nome: "Mario",
  cognome: "X",
  username: "mario.r",
  email: "mario@example.com",
  password: "password123",
  ruolo: "operatore",
}) !== null, "short cognome rejected");

assert(validateResolveLoginIdentifier("") !== null, "empty identifier rejected");
assert(validateResolveLoginIdentifier("user@test.com") === null, "email identifier ok");
assert(validateResolveLoginIdentifier("//evil.com") !== null, "protocol-relative rejected");
assert(validateResolveLoginIdentifier("ab") !== null, "short username rejected");

console.log("admin-user-validation.test.ts OK");
