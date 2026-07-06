/**
 * Portale clienti: WRITE RBAC non estende lo scope oltre cliente_ref (ownership via helper + RLS).
 */
import assert from "node:assert/strict";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";
import {
  lavorazioneMatchesClienteScope,
  mezzoMatchesClienteRef,
  validateClienteRefForRole,
} from "@/src/lib/auth/cliente-portal-scope";

const clienteResolved = resolvePageAccess({
  userId: "cliente-1",
  roleKey: "cliente",
  rolePageAccess: { lavorazioni_clienti: "write" },
  userPageOverrides: {},
});

assert.equal(clienteResolved.pages.lavorazioni_clienti.canWrite, true);
assert.equal(clienteResolved.pages.lavorazioni.canWrite, false);

assert.equal(validateClienteRefForRole("cliente", "Rossi Srl"), null);
assert.equal(validateClienteRefForRole("cliente", null) != null, true);

assert.equal(mezzoMatchesClienteRef({ cliente: "Rossi Srl" }, "Rossi Srl"), true);
assert.equal(mezzoMatchesClienteRef({ cliente: "Altri Spa" }, "Rossi Srl"), false);
assert.equal(
  mezzoMatchesClienteRef({ cliente: "Altri Spa" }, "Rossi Srl", {
    failClosedForClienteRole: true,
    role: "cliente",
  }),
  false,
);

assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "Rossi Srl" } as never }, "Rossi Srl"),
  true,
);
assert.equal(
  lavorazioneMatchesClienteScope({ mezzo: { cliente: "Altri Spa" } as never }, "Rossi Srl"),
  false,
);

console.log("rbac-portal-tenant-isolation.test.ts OK");
