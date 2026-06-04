import assert from "node:assert/strict";
import {
  clienteRoleRequiresRef,
  lavorazioneMatchesClienteScope,
  mezzoMatchesClienteRef,
  normalizeClienteRef,
  validateClienteRefForRole,
} from "@/src/lib/auth/cliente-portal-scope";

assert.equal(normalizeClienteRef("  ACME  "), "ACME");
assert.equal(normalizeClienteRef(""), null);
assert.equal(normalizeClienteRef(null), null);

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(clienteRoleRequiresRef("admin"), false);

assert.equal(validateClienteRefForRole("cliente", null), "Per il ruolo Cliente è obbligatorio associare un cliente.");
assert.equal(validateClienteRefForRole("cliente", "Rossi"), null);
assert.equal(validateClienteRefForRole("admin", null), null);

assert.equal(mezzoMatchesClienteRef({ cliente: "Rossi" }, "Rossi"), true);
assert.equal(mezzoMatchesClienteRef({ cliente: "Altri" }, "Rossi"), false);

assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "Rossi" } as never }, "Rossi"),
  true,
);
assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "X" } as never }, "Rossi"),
  false,
);

console.log("cliente-portal-scope.test.ts OK");
