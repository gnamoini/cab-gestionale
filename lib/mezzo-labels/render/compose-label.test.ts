import assert from "node:assert/strict";
import { composeMezzoLabel } from "@/lib/mezzo-labels/render/compose-label";
import { mmToPt } from "@/lib/mezzo-labels/domain/template";

const withScuderia = composeMezzoLabel(
  { targa: "AB123CD", numeroScuderia: "42" },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(withScuderia.texts.length, 2);
assert.equal(withScuderia.texts[0]?.kind, "scuderia");
assert.equal(withScuderia.texts[1]?.kind, "targa");
assert.ok(withScuderia.texts[1]?.text.includes("AB123CD"));

const withoutScuderia = composeMezzoLabel(
  { targa: "XY999ZZ", numeroScuderia: null },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(withoutScuderia.texts.length, 1);
assert.equal(withoutScuderia.texts[0]?.kind, "targa");

const qrPt = mmToPt(withScuderia.qr.sizeMm);
assert.ok(Math.abs(qrPt - 20 * 2.83464567) < 0.01, "QR bbox 20mm in pt");

console.log("mezzo-labels/render/compose-label.test.ts OK");
