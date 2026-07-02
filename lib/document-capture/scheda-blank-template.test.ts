import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SCHEDA_BLANK_RENDERER_HASH } from "@/lib/document-capture/scheda-blank-template-meta";
import { SCHEDA_BLANK_TEMPLATE_VERSION } from "@/lib/pdf/schede-blank-layout";

assert.equal(SCHEDA_BLANK_TEMPLATE_VERSION, "1.0.0");
assert.ok(SCHEDA_BLANK_RENDERER_HASH.ingresso.length === 64);
assert.ok(fs.existsSync(path.join(process.cwd(), "lib/pdf/schede-blank-layout.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/api/pdf/artifacts/scheda-blank/[type]/route.ts")));

console.log("scheda-blank-template.test.ts OK");
