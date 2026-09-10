import assert from "node:assert/strict";
import { buildFatturapaXmlFromSnapshot } from "@/lib/fatturazione/fe-sdi/fatturapa-xml.server";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

function fixture(tipo: string) {
  const snap = baseSnapshot(tipo);
  if (tipo === "TD04") {
    return buildFatturapaXmlFromSnapshot(
      snap,
      undefined,
      "inv-1",
      "company-1",
    );
  }
  return buildFatturapaXmlFromSnapshot(snap);
}

const td01 = fixture("TD01");
assert.equal(td01.ok, true);
assert.ok(td01.xml.includes("TD01"));

const td04 = buildFatturapaXmlFromSnapshot(
  baseSnapshot("TD04"),
  undefined,
  "inv-nc",
  "company-1",
);
// without linked invoice reference TD04 fails
assert.equal(td04.ok, false);

console.log("invoice-xml-fixtures.test.ts OK");
