import assert from "node:assert/strict";
import {
  CLIENTE_ASSOCIATION_REQUIRED_MSG,
  CLIENTE_ASSOCIATION_REQUIRED_SHORT_MSG,
  CLIENTE_REF_UNKNOWN_MSG,
  CLIENTE_REF_UNKNOWN_SHORT_MSG,
  buildKnownClientiSet,
  clienteRoleRequiresRef,
  fieldClienteAssociationMessage,
  lavorazioneMatchesClienteScope,
  mezzoMatchesClienteRef,
  normalizeClienteRef,
  validateClienteAssociationForRole,
  validateClienteRefForRole,
} from "@/src/lib/auth/cliente-portal-scope";

assert.equal(normalizeClienteRef("  ACME  "), "ACME");
assert.equal(normalizeClienteRef(""), null);
assert.equal(normalizeClienteRef(null), null);

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(clienteRoleRequiresRef("admin"), false);

assert.equal(validateClienteRefForRole("cliente", null), CLIENTE_ASSOCIATION_REQUIRED_MSG);
assert.equal(validateClienteRefForRole("cliente", "Rossi"), null);
assert.equal(validateClienteRefForRole("admin", null), null);

assert.equal(
  fieldClienteAssociationMessage(CLIENTE_ASSOCIATION_REQUIRED_MSG),
  CLIENTE_ASSOCIATION_REQUIRED_SHORT_MSG,
);
assert.equal(fieldClienteAssociationMessage(CLIENTE_REF_UNKNOWN_MSG), CLIENTE_REF_UNKNOWN_SHORT_MSG);
assert.equal(fieldClienteAssociationMessage(null), null);
assert.equal(fieldClienteAssociationMessage("Altro errore"), "Altro errore");

const known = buildKnownClientiSet(["Rossi"]);
assert.equal(validateClienteAssociationForRole("cliente", "Fantasma", known) != null, true);

assert.equal(mezzoMatchesClienteRef({ cliente: "Rossi" }, "Rossi"), true);
assert.equal(mezzoMatchesClienteRef({ cliente: "Altri" }, "Rossi"), false);
assert.equal(mezzoMatchesClienteRef({ cliente: "Rossi" }, null, { failClosedForClienteRole: true, role: "cliente" }), false);
assert.equal(mezzoMatchesClienteRef({ cliente: "Rossi" }, null, { failClosedForClienteRole: true, role: "admin" }), true);

assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "Rossi" } as never }, "Rossi"),
  true,
);
assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "X" } as never }, "Rossi"),
  false,
);
assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "X" } as never }, null, {
    failClosedForClienteRole: true,
    role: "cliente",
  }),
  false,
);

console.log("cliente-portal-scope.test.ts OK");
