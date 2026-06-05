import assert from "node:assert/strict";
import {
  buildKnownClientiSet,
  CLIENTE_ASSOCIATION_REQUIRED_MSG,
  CLIENTE_REF_UNKNOWN_MSG,
  validateClienteAssociationForRole,
} from "@/src/lib/auth/cliente-portal-scope";

const known = buildKnownClientiSet(["Rossi Srl", "Bianchi"]);

assert.equal(validateClienteAssociationForRole("cliente", null, known), CLIENTE_ASSOCIATION_REQUIRED_MSG);
assert.equal(validateClienteAssociationForRole("cliente", "Rossi Srl", known), null);
assert.equal(validateClienteAssociationForRole("cliente", "Inesistente", known), CLIENTE_REF_UNKNOWN_MSG);
assert.equal(validateClienteAssociationForRole("admin", null, known), null);
assert.equal(validateClienteAssociationForRole("operatore", "Rossi Srl", known), null);

console.log("cliente-association-audit.test.ts OK");
