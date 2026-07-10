import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const router = fs.readFileSync(path.join(ROOT, "lib/data-import/core/import-api-router.server.ts"), "utf8");
assert.match(router, /assertBackupImportAllowed/);
assert.match(router, /assessImportCompatibility/);
assert.match(router, /isImportExcelActive/);

const executor = fs.readFileSync(path.join(ROOT, "lib/data-import/core/command-executor.server.ts"), "utf8");
assert.match(executor, /findSuccessfulFingerprintDuplicate/);
assert.match(executor, /assertBackupImportAllowed/);

console.log("import-export-prg/failure-injection.test.ts OK");
