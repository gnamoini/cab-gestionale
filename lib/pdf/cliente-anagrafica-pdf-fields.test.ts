import assert from "node:assert/strict";
import {
  buildClienteFiscalePdfFields,
  buildPreventivoClientePdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";
import { emptyClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const anag = emptyClienteAnagrafica("Cliente Test", "clientetest");
anag.id = "550e8400-e29b-41d4-a716-446655440000";
anag.ragioneSociale = "Cliente Test S.r.l.";
anag.partitaIva = "12345678901";
anag.codiceDestinatario = "ABC1234";
anag.sedi.legale = {
  via: "Via Roma",
  numeroCivico: "10",
  cap: "70100",
  citta: "Bari",
  provincia: "BA",
  stato: "IT",
};
anag.sedi.operativa = {
  via: "Via Milano",
  numeroCivico: "5",
  cap: "20100",
  citta: "Milano",
  provincia: "MI",
  stato: "IT",
};
anag.sedeLegaleUgualeOperativa = false;
anag.contatti = [
  { id: "1", etichetta: "PEC", tipo: "pec", valore: "test@pec.it", ordine: 0 },
  { id: "2", etichetta: "Email", tipo: "email", valore: "info@test.it", ordine: 1 },
  { id: "3", etichetta: "Tel", tipo: "telefono", valore: "080123456", ordine: 2 },
];

const fiscali = buildClienteFiscalePdfFields(anag, { codiceFiscale: "RSSMRA80A01H501Z" });
const labels = fiscali.map((f) => f.label);
assert.ok(labels.includes("Ragione sociale"));
assert.ok(labels.includes("Sede legale"));
assert.ok(labels.includes("Sede operativa"));
assert.ok(labels.includes("Partita IVA"));
assert.ok(labels.includes("Codice fiscale"));
assert.ok(labels.includes("PEC"));

const p = {
  cliente: "Cliente Test",
  cantiere: "Cant",
  utilizzatore: "Util",
  richiedente: "Req",
} as PreventivoRecord;

const merged = buildPreventivoClientePdfFields(p, {
  clienteAnagrafica: anag,
  codiceFiscale: "RSSMRA80A01H501Z",
});
assert.ok(merged.some((f) => f.label === "Cantiere" && f.value === "Cant"));
assert.ok(merged.some((f) => f.label === "Partita IVA"));

const soloOperativi = buildPreventivoClientePdfFields(p);
assert.ok(soloOperativi.some((f) => f.label === "Cliente"));
assert.equal(soloOperativi.some((f) => f.label === "Partita IVA"), false);

console.log("cliente-anagrafica-pdf-fields.test.ts OK");
