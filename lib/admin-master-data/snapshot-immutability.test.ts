import assert from "node:assert/strict";
import { billingSnapshotFromAnagrafica } from "@/lib/fatturazione/billing-customer-bridge";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { emptyClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";

function cloneAnagrafica(base: ClienteAnagrafica): ClienteAnagrafica {
  return JSON.parse(JSON.stringify(base)) as ClienteAnagrafica;
}

const anag = emptyClienteAnagrafica("Cliente Test", "cliente:test");
anag.id = "00000000-0000-4000-8000-000000000099";
anag.ragioneSociale = "Cliente Test SRL";
anag.partitaIva = "12345678901";

const snapshotAtIssue = billingSnapshotFromAnagrafica(anag);

const modified = cloneAnagrafica(anag);
modified.ragioneSociale = "Cliente Modificato SRL";
modified.partitaIva = "98765432109";

const snapshotAfter = billingSnapshotFromAnagrafica(modified);

assert.equal(snapshotAtIssue.ragione_sociale, "Cliente Test SRL");
assert.equal(snapshotAtIssue.partita_iva, "12345678901");
assert.notEqual(snapshotAfter.ragione_sociale, snapshotAtIssue.ragione_sociale);
assert.equal(snapshotAtIssue.ragione_sociale, "Cliente Test SRL");

console.log("snapshot-immutability.test.ts OK");
