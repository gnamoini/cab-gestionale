import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import { generatePreventivoPdfBytes } from "@/lib/preventivi/preventivo-pdf-generate";

const draft = buildEmptyManualPreventivo("Operatore", []);
const bytes = generatePreventivoPdfBytes(draft, "Operatore", null);

assert.ok(bytes.length > 1024, "PDF bytes should be non-trivial");
assert.equal(
  String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]),
  "%PDF",
  "output must start with PDF magic bytes",
);

const preventiviPdfSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/preventivi/preventivi-pdf.ts"),
  "utf8",
);
assert.match(preventiviPdfSrc, /pushGestionaleToast/);
assert.match(preventiviPdfSrc, /openPreventivoPdfPreviewFromRecordAsync/);

console.log("preventivo-pdf-generate.test.ts OK");
