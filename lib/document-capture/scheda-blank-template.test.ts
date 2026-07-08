import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SCHEDA_BLANK_RENDERER_HASH } from "@/lib/document-capture/scheda-blank-template-meta";
import { SCHEDA_BLANK_TEMPLATE_VERSION } from "@/lib/pdf/schede-blank-layout";

assert.equal(SCHEDA_BLANK_TEMPLATE_VERSION, "2.0.0");
assert.ok(SCHEDA_BLANK_RENDERER_HASH.ingresso.length === 64);
assert.notEqual(SCHEDA_BLANK_RENDERER_HASH.ingresso, SCHEDA_BLANK_RENDERER_HASH.lavorazioni);
assert.notEqual(SCHEDA_BLANK_RENDERER_HASH.ingresso, SCHEDA_BLANK_RENDERER_HASH.ricambi);
assert.notEqual(SCHEDA_BLANK_RENDERER_HASH.lavorazioni, SCHEDA_BLANK_RENDERER_HASH.ricambi);
assert.equal(
  SCHEDA_BLANK_RENDERER_HASH.lavorazioni,
  "2875515f5760bb3817c9b1ae8140e46e5544dec52aa07e860dec9425fc21c7c3",
);
assert.equal(
  SCHEDA_BLANK_RENDERER_HASH.ricambi,
  "78904233fc300378fc577e7ae01488d4b5f0e59bcaabf7335d68464fd67d559f",
);
assert.ok(fs.existsSync(path.join(process.cwd(), "lib/pdf/schede-blank-layout.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/api/pdf/artifacts/scheda-blank/[type]/route.ts")));

console.log("scheda-blank-template.test.ts OK");
