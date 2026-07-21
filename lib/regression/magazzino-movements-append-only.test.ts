import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const svc = fs.readFileSync(path.join(ROOT, "src/services/movimenti.service.ts"), "utf8");
const entry = fs.readFileSync(path.join(ROOT, "lib/domain/movimenti-entry.ts"), "utf8");

assert.match(svc, /async storno/);
assert.match(svc, /Eliminazione movimento non consentita/);
assert.match(svc, /Modifica movimento contabilizzato non consentita/);
assert.match(entry, /storno/);

console.log("magazzino-movements-append-only.test.ts OK");
