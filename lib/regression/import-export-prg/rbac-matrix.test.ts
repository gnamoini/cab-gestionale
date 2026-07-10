import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const auth = fs.readFileSync(path.join(ROOT, "lib/data-import/core/import-api-auth.server.ts"), "utf8");
assert.match(auth, /verifyServerPageWrite/);
assert.match(auth, /ordini_fornitori/);

const perms = fs.readFileSync(path.join(ROOT, "lib/data-import/core/import-permissions.ts"), "utf8");
assert.match(perms, /import-capabilities/);

console.log("import-export-prg/rbac-matrix.test.ts OK");
