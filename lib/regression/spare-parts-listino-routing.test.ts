import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isListinoDocument } from "@/lib/documents/document-listino-detect";

assert.equal(isListinoDocument({ categoria: "listino" }), true);

const understanding = fs.readFileSync(
  path.join(process.cwd(), "lib/ai/spare-parts/understanding/document-understanding.server.ts"),
  "utf8",
);
assert.match(understanding, /isListinoDocument/);
assert.doesNotMatch(understanding, /categoria === "listini"/);

const structured = fs.readFileSync(
  path.join(process.cwd(), "lib/ai/spare-parts/retrieval/structured-catalog.server.ts"),
  "utf8",
);
assert.match(structured, /isListinoDocument/);
assert.doesNotMatch(structured, /categoria === "listini"/);

console.log("spare-parts-listino-routing.test.ts OK");
