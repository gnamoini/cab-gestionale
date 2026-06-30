import assert from "node:assert/strict";
import { moveClienteContattoDown, moveClienteContattoUp } from "@/lib/clienti/clienti-contatti-order";
import type { ClienteContatto } from "@/lib/clienti/clienti-anagrafica-types";

const rows: ClienteContatto[] = [
  { id: "a", etichetta: "A", tipo: "email", valore: "a@test.it", ordine: 0 },
  { id: "b", etichetta: "B", tipo: "telefono", valore: "080", ordine: 1 },
];

const down = moveClienteContattoDown(rows, "a");
assert.equal(down[0]?.id, "b");
assert.equal(down[1]?.id, "a");

const up = moveClienteContattoUp(down, "a");
assert.equal(up[0]?.id, "a");

console.log("clienti-anagrafica-validation.test.ts OK");
