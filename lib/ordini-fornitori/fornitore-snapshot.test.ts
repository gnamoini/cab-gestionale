import assert from "node:assert/strict";
import {
  buildFornitoreSnapshotFromLabel,
  ordineFornitoreFornitorePdfFields,
  parseOrdineFornitoreFornitoreSnapshot,
  patchOrdineFornitoreFornitoreSnapshot,
  resolveOrdineFornitoreCodiceFiscale,
  resolveOrdineFornitoreTelefono,
} from "@/lib/ordini-fornitori/fornitore-snapshot";

const snap = parseOrdineFornitoreFornitoreSnapshot(
  { label: "ACME", partita_iva: "IT111", telefono: "0801234567" },
  "ACME",
);
assert.equal(snap.partitaIva, "IT111");
assert.equal(snap.telefono, "0801234567");

const patched = patchOrdineFornitoreFornitoreSnapshot({}, "Beta Srl", {
  indirizzo: "Via Roma 1",
  codiceFiscale: "RSSMRA80A01H501Z",
});
assert.equal((patched as { indirizzo?: string }).indirizzo, "Via Roma 1");

const pdf = ordineFornitoreFornitorePdfFields("Beta Srl", parseOrdineFornitoreFornitoreSnapshot(patched, "Beta Srl"));
assert.ok(pdf.some((f) => f.label === "Partita IVA" || f.label === "Codice fiscale"));

assert.deepEqual(buildFornitoreSnapshotFromLabel("ACME"), {
  label: "ACME",
  ragioneSociale: "ACME",
  indirizzo: "",
  partitaIva: "",
  codiceFiscale: "",
  telefono: "+39",
});

assert.equal(resolveOrdineFornitoreCodiceFiscale({ codiceFiscale: "", partitaIva: "IT123" }), "IT123");
assert.equal(resolveOrdineFornitoreCodiceFiscale({ codiceFiscale: "CF99", partitaIva: "IT123" }), "CF99");

const pdfCf = ordineFornitoreFornitorePdfFields(
  "ACME",
  parseOrdineFornitoreFornitoreSnapshot({ partitaIva: "IT123" }, "ACME"),
);
assert.equal(pdfCf.find((f) => f.label === "Codice fiscale")?.value, "IT123");

assert.equal(resolveOrdineFornitoreTelefono({ telefono: "" }), "+39");
assert.equal(resolveOrdineFornitoreTelefono({ telefono: "+" }), "+");
assert.equal(resolveOrdineFornitoreTelefono({ telefono: "0801234567" }), "0801234567");

const pdfTel = ordineFornitoreFornitorePdfFields("ACME", parseOrdineFornitoreFornitoreSnapshot({}, "ACME"));
assert.equal(pdfTel.find((f) => f.label === "Telefono")?.value, "+39");

console.log("fornitore-snapshot.test.ts OK");
