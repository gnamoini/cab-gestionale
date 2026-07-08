import assert from "node:assert/strict";
import {
  parseOfficinaBancheOrdiniSettings,
  resolveOfficinaBancaIban,
} from "@/lib/officina/officina-banche-ordini";
import {
  ordineFornitoreDestinatarioPdfFields,
  parseOrdineFornitoreDestinatarioSnapshot,
} from "@/lib/ordini-fornitori/destinatario-snapshot";

const banche = parseOfficinaBancheOrdiniSettings([
  { id: "1", nome: "Intesa", iban: "IT11" },
  { id: "2", nome: "UniCredit", iban: "IT22" },
]);
assert.equal(banche.length, 2);
assert.equal(resolveOfficinaBancaIban(banche, "intesa"), "IT11");

const legacy = parseOrdineFornitoreDestinatarioSnapshot({ bancaAppoggio: "Banca legacy" }, "");
assert.equal(legacy.bancaAppoggioNome, "Banca legacy");
assert.equal(legacy.bancaAppoggioIban, "");

const split = parseOrdineFornitoreDestinatarioSnapshot(
  { bancaAppoggioNome: "Intesa", bancaAppoggioIban: "IT11" },
  "",
);
assert.equal(split.bancaAppoggioNome, "Intesa");
assert.equal(split.bancaAppoggioIban, "IT11");

const pdf = ordineFornitoreDestinatarioPdfFields({
  label: "",
  indirizzo: "",
  partitaIva: "",
  codiceFiscale: "",
  telefono: "",
  bancaAppoggioNome: "Intesa",
  bancaAppoggioIban: "IT11",
});
assert.ok(pdf.some((r) => r.label === "IBAN" && r.value === "IT11"));

console.log("officina-banche-ordini.test.ts ok");
