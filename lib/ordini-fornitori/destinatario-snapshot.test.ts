import assert from "node:assert/strict";
import {
  ordineFornitoreDestinatarioPdfFields,
  parseOrdineFornitoreDestinatarioSnapshot,
} from "@/lib/ordini-fornitori/destinatario-snapshot";

const parsed = parseOrdineFornitoreDestinatarioSnapshot(
  { tipo: "altro", partitaIva: "IT111", codiceFiscale: "" },
  "Via Test 1",
);
assert.equal(parsed.indirizzo, "Via Test 1");
assert.equal(parsed.partitaIva, "IT111");

const pdf = ordineFornitoreDestinatarioPdfFields({
  label: "Dest SPA",
  indirizzo: "Via Test 1",
  partitaIva: "IT111",
  codiceFiscale: "",
  telefono: "",
  bancaAppoggioNome: "Intesa",
  bancaAppoggioIban: "IT00",
});
assert.ok(pdf.some((r) => r.label === "Codice fiscale" && r.value === "IT111"));
assert.ok(pdf.some((r) => r.label === "Banca d'appoggio" && r.value === "Intesa"));
assert.ok(pdf.some((r) => r.label === "IBAN" && r.value === "IT00"));

console.log("destinatario-snapshot.test.ts OK");
